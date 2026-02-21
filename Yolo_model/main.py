import asyncio
import io
import os
import time
import torch
import threading
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import numpy as np
import cv2

# --- Critical: Force TCP for RTSP Stability ---
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

# --- Global Concurrency Lock ---
# Prevents "Zombie" Live threads from contending with Offline threads for the GPU
# Prevents "Zombie" Live threads from contending with Offline threads for the GPU
model_lock = threading.Lock()
active_camera = None

# --- Global Live Detection Data ---
# Stores the latest detection data for live streams
live_detection_data = {
    "detections": [],
    "fps": 0,
    "timestamp": 0
}
live_data_lock = threading.Lock()

app = FastAPI()

# Allow CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the YOLO model
try:
    # Use GPU if available
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = YOLO("epoch10.pt")
    
    # Optimization: Fuse layers for faster inference
    model.to(device)
    if device == 'cuda':
        model.model.fuse()
        # Use half precision on GPU
        model.model.half()
        
    # Pre-warm the model with a dummy frame
    # We use the same size as our optimized inference (480)
    model(np.zeros((480, 480, 3), dtype=np.uint8), verbose=False, imgsz=480)
    print(f"✅ Model 'epoch10.pt' optimized for {device} (FP16: {device=='cuda'}) and warmed up.")
except Exception as e:
    print(f"⚠️ Could not optimize 'epoch10.pt'. Error: {e}")


@app.get("/")
def read_root():
    return {"status": "Traffic Detection Service Running"}

# --- Offline Detection (WebSocket) ---
@app.websocket("/ws/detection")
async def websocket_detection_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Offline Client connected")
    
    # FEEDBACK: Offline Mode Starting
    print(">>> [BACKEND] OFFLINE MODE STARTING: Requesting YOLO Model Lock...")

    try:
        while True:
            # 1. Receive image bytes from frontend
            data = await websocket.receive_bytes()
            start_time = time.time()
            
            # 2. Optimized: Direct decode to NumPy
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                continue

            # 3. Run Inference with Tracking (Thread-Safe)
            with model_lock:
                # FEEDBACK: Lock Acquired
                if 'offline_active_logged' not in locals():
                     print(">>> [BACKEND] OFFLINE MODE ACTIVE: Model Lock Acquired.")
                     offline_active_logged = True

                results = model.track(
                    source=frame,
                    persist=True, 
                    conf=0.4,     
                    tracker="bytetrack.yaml", 
                    verbose=False,
                    stream=False,  # Blocking: Inference happens INSIDE lock
                    half=(device == 'cuda') 
                )
            # <<< LOCK RELEASED: Post-processing happens concurrently >>>
            
            detections = []
            
            # 4. Process Results (Iterate generator)
            for result in results:
                if result.boxes is not None:
                    boxes = result.boxes.xywhn.cpu().numpy()
                    classes = result.boxes.cls.cpu().numpy()
                    confs = result.boxes.conf.cpu().numpy()
                    
                    if result.boxes.id is not None:
                        track_ids = result.boxes.id.int().cpu().numpy()
                    else:
                        track_ids = [None] * len(boxes)
                    
                    names = result.names
                    
                    for i in range(len(boxes)):
                        x_center, y_center, w, h = boxes[i]
                        
                        # Correct Bounding Box Logic: Convert center to Top-Left
                        x = x_center - (w / 2)
                        y = y_center - (h / 2)
                        
                        det = {
                            "label": names[int(classes[i])],
                            "conf": round(float(confs[i]), 2),
                            "box": [float(x), float(y), float(w), float(h)]
                        }
                        
                        if track_ids[i] is not None:
                            det["id"] = int(track_ids[i])
                            
                        detections.append(det)

            # Calculate metrics
            process_time = time.time() - start_time
            fps = int(1 / process_time) if process_time > 0 else 30

            # 5. Send JSON response
            await websocket.send_json({
                "detections": detections, 
                "fps": fps,
                "latency_ms": int(process_time * 1000)
            })
            
    except WebSocketDisconnect:
        print("Offline Client disconnected")
    except Exception as e:
        print(f"Offline Error: {e}")
        try:
            await websocket.close()
        except:
            pass

# --- Live Detection Data (WebSocket) ---
@app.websocket("/ws/live-detection")
async def websocket_live_detection_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Live Detection Data Client connected")
    
    try:
        while True:
            # Send the latest detection data
            with live_data_lock:
                data = {
                    "detections": live_detection_data["detections"],
                    "fps": live_detection_data["fps"]
                }
            
            await websocket.send_json(data)
            
            # Send updates at ~30 FPS
            await asyncio.sleep(0.033)
            
    except WebSocketDisconnect:
        print("Live Detection Data Client disconnected")
    except Exception as e:
        print(f"Live Detection Data Error: {e}")
        try:
            await websocket.close()
        except:
            pass


TARGET_WIDTH = 640

def initialize_stream(url):
    """
    Initializes the video stream with robust error handling and configuration.
    """
    if url.startswith("http") and url.split(":")[-1].isdigit() and not url.endswith("/video"):
        print(f"Warning: URL '{url}' looks like a raw IP. Appending '/video' for better compatibility.")
        url += "/video"
    elif url.startswith("http") and url.endswith(("/", ":8080", ":8080/")):
         url = url.rstrip("/")
         if not url.endswith("/video"):
             url += "/video"
             print(f"Auto-corrected URL to: {url}")

    print(f"Connecting to stream: {url}...")
    
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    
    try:
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)
    except Exception:
        pass 

    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    
    return cap

# --- Low Latency Threaded Camera ---
class VideoCamera:
    def __init__(self, url):
        self.url = url
        self.video = initialize_stream(url)
        
        # Connection check
        if not self.video.isOpened():
             print(f"Error: Could not open stream {url}")
             self.running = False
        else:
             self.running = True

        self.lock = threading.Lock()
        self.frame = None
        
        # Start background thread
        if self.running:
            self.thread = threading.Thread(target=self.update, args=())
            self.thread.daemon = True
            self.thread.start()

    def __del__(self):
        self.stop()

    def stop(self):
        # FEEDBACK: Shutting Down
        print(">>> [BACKEND] SHUTTING DOWN LIVE THREAD... Cleaning up resources.")
        
        # Release socket immediately to break blocking calls
        if hasattr(self, 'video') and self.video.isOpened():
            self.video.release()
            
        self.running = False
        # FEEDBACK: Freed
        print(">>> [BACKEND] LIVE CAMERA RELEASED. YOLO Model is now FREE.")
        print("DEBUG: Live Camera Thread Terminated Successfully.")

    def update(self):
        while self.running:
            success, frame = self.video.read()
            
            if not success:
                print("Stream ended or connection lost. Attempting to reconnect...")
                
                # Release immediately to prevent hanging
                if self.video.isOpened():
                    self.video.release()

                reconnected = False
                for attempt in range(1, 4):
                    # STRICT CHECK: Check before sleep
                    if not self.running:
                        print(">>> [BACKEND] Reconnection aborted: Thread signaled to stop.")
                        return

                    print(f"Reconnection attempt {attempt}/3 in 2 seconds...")
                    
                    # Wait in chunks to allow fast exit
                    for _ in range(20): # 20 * 0.1s = 2s
                        if not self.running: 
                            return
                        time.sleep(0.1)
                    
                    # STRICT CHECK: Check after sleep
                    if not self.running:
                        print(">>> [BACKEND] Reconnection aborted: Thread signaled to stop.")
                        return
                    
                    if self.video.isOpened():
                        self.video.release()
                    
                    if not self.running: return
                    self.video = initialize_stream(self.url)
                    
                    if self.video.isOpened():
                        success, frame = self.video.read()
                        if success:
                            print("Reconnection successful!")
                            reconnected = True
                            break
                
                if not reconnected:
                    if self.running:
                        print("Could not reconnect after 3 attempts.")
                    self.running = False
                    break
            
            if success and frame is not None:
                # Resize immediately in thread to save bandwidth/compute later
                h, w = frame.shape[:2]
                if w > TARGET_WIDTH:
                    scale = TARGET_WIDTH / w
                    new_h = int(h * scale)
                    frame = cv2.resize(frame, (TARGET_WIDTH, new_h))
                
                with self.lock:
                    self.frame = frame
            
            # STRICT CHECK: Don't linger if shutdown requested
            if not self.running:
                break

    def get_frame(self):
        with self.lock:
            return self.frame.copy() if self.frame is not None else None

# Changed to synchronous 'def' to ensure better disconnect handling
@app.get("/live-stream")
def live_stream_endpoint(url: str):
    if not url:
        return JSONResponse(status_code=400, content={"error": "URL parameter required"})
    
    # Quick connectivity check
    test_cap = initialize_stream(url)
    if not test_cap.isOpened():
         return JSONResponse(status_code=400, content={"error": "Could not open video stream. Check URL."})
    test_cap.release()

    # Singleton Management: Prevent Zombies
    global active_camera
    if active_camera is not None:
        print("Stopping previous active camera...")
        active_camera.stop()

    # Instantiate Camera for THIS request
    active_camera = VideoCamera(url)
    camera = active_camera

    def generate():
        frame_count = 0
        start_time = time.time()
        
        try:
            if not camera.running:
                 return # Exit if camera failed to start

            while True:
                frame = camera.get_frame()
                
                if frame is None:
                    time.sleep(0.01)
                    continue

                # Run YOLO Inference (Thread-Safe)
                # CRITICAL: stream=True + Lock
                with model_lock:
                    results = model.track(
                        source=frame,
                        persist=True,
                        conf=0.4,
                        tracker="bytetrack.yaml",
                        verbose=False,
                        half=(device == 'cuda'),
                        stream=False # Blocking: Inference happens INSIDE lock
                    )
                # <<< LOCK RELEASED: Encoding & Network I/O happen concurrently >>>
                
                # Iterate to retrieve result and free memory
                for result in results:
                    # Extract detection data for WebSocket
                    detections = []
                    if result.boxes is not None:
                        boxes = result.boxes.xywhn.cpu().numpy()
                        classes = result.boxes.cls.cpu().numpy()
                        confs = result.boxes.conf.cpu().numpy()
                        
                        if result.boxes.id is not None:
                            track_ids = result.boxes.id.int().cpu().numpy()
                        else:
                            track_ids = [None] * len(boxes)
                        
                        names = result.names
                        
                        for i in range(len(boxes)):
                            x_center, y_center, w, h = boxes[i]
                            
                            # Correct Bounding Box Logic: Convert center to Top-Left
                            x = x_center - (w / 2)
                            y = y_center - (h / 2)
                            
                            det = {
                                "label": names[int(classes[i])],
                                "conf": round(float(confs[i]), 2),
                                "box": [float(x), float(y), float(w), float(h)]
                            }
                            
                            if track_ids[i] is not None:
                                det["id"] = int(track_ids[i])
                                
                            detections.append(det)
                    
                    # Calculate FPS
                    frame_count += 1
                    elapsed = time.time() - start_time
                    fps = int(frame_count / elapsed) if elapsed > 0 else 0
                    
                    # Update global detection data
                    with live_data_lock:
                        live_detection_data["detections"] = detections
                        live_detection_data["fps"] = fps
                        live_detection_data["timestamp"] = time.time()
                    
                    annotated_frame = result.plot()

                    # Encode to JPEG
                    ret, buffer = cv2.imencode('.jpg', annotated_frame)
                    frame_bytes = buffer.tobytes()

                    yield (b'--frame\r\n'
                        b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                
                # Yield control to allow other threads (Offline) to run
                time.sleep(0.01)

        except GeneratorExit:
            print(f"Client disconnected from {url}")
        except Exception as e:
            print(f"Stream error: {e}")
        finally:
            # CRITICAL: This runs when frontend unmounts <img />
            camera.stop()
            # Clear detection data
            with live_data_lock:
                live_detection_data["detections"] = []
                live_detection_data["fps"] = 0
            print("Resources released for live stream.")

    return StreamingResponse(
        generate(), 
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

if __name__ == "__main__":
    import uvicorn
    # Use log_level='error' to reduce terminal overhead
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="error")
