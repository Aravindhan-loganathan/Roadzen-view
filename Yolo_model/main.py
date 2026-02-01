import asyncio
import io
import time
import torch
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import numpy as np
import cv2

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

@app.websocket("/ws/detection")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected")
    
    # Tracker state is maintained by the YOLO model instance when persist=True
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

            # 3. Run Inference with Tracking
            # imgsz=640 provides much better box regression on vehicle fronts
            results = model.track(
                frame, 
                persist=True, 
                conf=0.25,     
                iou=0.45,      # Adjusted for tighter box grouping
                imgsz=640,     
                tracker="custom_tracker.yaml", 
                verbose=False,
                half=(device == 'cuda') 
            )
            
            detections = []
            
            # 4. Process Results
            if results and len(results) > 0:
                result = results[0]
                if result.boxes is not None:
                    # Fetching all required data to CPU once
                    # xywhn: [x_center, y_center, width, height] normalized
                    boxes = result.boxes.xywhn.cpu().numpy()
                    classes = result.boxes.cls.cpu().numpy()
                    confs = result.boxes.conf.cpu().numpy()
                    
                    # Handle track IDs (ByteTrack ensures these stay consistent)
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
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")
        try:
            await websocket.close()
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    # Use log_level='error' to reduce terminal overhead
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="error")
