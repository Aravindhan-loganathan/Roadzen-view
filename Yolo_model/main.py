import asyncio
import io
import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import numpy as np
import cv2
from PIL import Image

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
# Ensure 'best.pt' is in the same directory or provide absolute path
try:
    model = YOLO("best.pt")
    print("✅ Model 'best.pt' loaded successfully")
except Exception as e:
    print(f"⚠️ Could not load 'best.pt'. Downloading 'yolov8n.pt' as fallback...")
    model = YOLO("yolov8n.pt")


@app.get("/")
def read_root():
    return {"status": "Traffic Detection Service Running"}

@app.websocket("/ws/detection")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected")
    
    try:
        while True:
            # 1. Receive image bytes from frontend
            data = await websocket.receive_bytes()
            
            start_time = time.time()
            
            # 2. Convert bytes to numpy array (OpenCV format)
            image = Image.open(io.BytesIO(data))

            # Check image mode and convert if necessary
            if image.mode != "RGB":
                image = image.convert("RGB")
            frame = np.array(image)
            
            # Convert RGB to BGR (YOLO/OpenCV expects BGR)
            frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

            
            # 3. Run Inference with Tracking (persist=True maintains IDs)
            # Added conf=0.25 to ensure detections are returned (matches standard inference)
            results = model.track(frame, persist=True, conf=0.25, verbose=False)
            
            detections = []
            
            # 4. Process Results
            for result in results:
                # boxes.xywhn returns [x_center, y_center, width, height] normalized 0-1
                # boxes.cls returns class indices
                # boxes.conf returns confidence scores
                # boxes.id returns track IDs (if available)
                
                # Handle cases where no IDs are returned (detection only)
                track_ids = result.boxes.id.int().cpu().tolist() if result.boxes.id is not None else [None] * len(result.boxes)
                
                for box, cls, conf, track_id in zip(result.boxes.xywhn, result.boxes.cls, result.boxes.conf, track_ids):
                    x_center, y_center, w, h = box.tolist()
                    
                    #Convert center coordinates to top-left corner
                    x = x_center - (w / 2)
                    y = y_center - (h / 2)
                    
                    label = result.names[int(cls)]
                    
                    det = {
                        "label": label,
                        "conf": float(conf),
                        "box": [x, y, w, h]
                    }
                    
                    if track_id is not None:
                        det["id"] = track_id
                        
                    detections.append(det)

            # Calculate FPS
            process_time = time.time() - start_time
            fps = int(1 / process_time) if process_time > 0 else 30

            # 5. Send JSON response
            await websocket.send_json({"detections": detections, "fps": fps})
            
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()


if __name__ == "__main__":
    import uvicorn
    # Run on port 8000 to match frontend config
    uvicorn.run(app, host="0.0.0.0", port=8000)