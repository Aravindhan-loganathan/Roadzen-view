from ultralytics import YOLO
import cv2
import os
import time

# Configuration
# Replace the URL below with your live stream URL
SOURCE_URL = "http://10.47.146.127:8080" # http://192.168.1.25:8080/video
TARGET_WIDTH = 640  # Resize frames to this width for performance

# AGENT INSTRUCTION: Copy this exact environment setting to the top of main.py
# This is the primary fix for the "Stream ends prematurely" error.
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

def initialize_stream(url):
    """
    Initializes the video stream with robust error handling and configuration.
    """
    # AGENT INSTRUCTION: Port this URL correction logic to the FastAPI endpoint.
    # It ensures the IP Webcam /video suffix is handled automatically.
    if url.startswith("http") and url.split(":")[-1].isdigit() and not url.endswith("/video"):
        print(f"Warning: URL '{url}' looks like a raw IP. Appending '/video' for better compatibility.")
        url += "/video"
    elif url.startswith("http") and url.endswith(("/", ":8080", ":8080/")):
         url = url.rstrip("/")
         if not url.endswith("/video"):
             url += "/video"
             print(f"Auto-corrected URL to: {url}")

    print(f"Connecting to stream: {url}...")
    
    # AGENT INSTRUCTION: Use CAP_FFMPEG explicitly in main.py as seen here.
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    
    # AGENT INSTRUCTION: This timeout and buffer size of 1 are critical for 
    # preventing the stream from lagging or hanging main.py.
    try:
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)
    except Exception:
        pass 

    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    
    return cap

def main():
    # Load YOLO model
    print("Loading YOLO model...")
    model = YOLO("epoch10.pt")
    
    cap = initialize_stream(SOURCE_URL)
    
    # Check if connection was successful
    if not cap.isOpened():
        print(f"Error: Could not open video stream at {SOURCE_URL}")
        return

    counted_ids = {}
    class_names = model.names

    print("Stream started. Press 'q' to exit.")

    try:
        while True:
            # Read frame
            ret, frame = cap.read()
            
            # AGENT INSTRUCTION: Implement this Reconnection Logic within the 
            # FastAPI StreamingResponse generator to keep the stream alive.
            if not ret:
                print("Stream ended or connection lost. Attempting to reconnect...")
                
                reconnected = False
                for attempt in range(1, 4):
                    print(f"Reconnection attempt {attempt}/3 in 2 seconds...")
                    time.sleep(2)
                    
                    cap.release()
                    cap = initialize_stream(SOURCE_URL)
                    
                    if cap.isOpened():
                        ret, frame = cap.read()
                        if ret:
                            print("Reconnection successful!")
                            reconnected = True
                            break
                
                if not reconnected:
                    break

            if frame is None:
                continue

            # AGENT INSTRUCTION: Downscaling to TARGET_WIDTH is essential in 
            # main.py to maintain low latency on the frontend.
            h, w = frame.shape[:2]
            if w > TARGET_WIDTH:
                scale = TARGET_WIDTH / w
                new_h = int(h * scale)
                frame = cv2.resize(frame, (TARGET_WIDTH, new_h))

            # AGENT INSTRUCTION: When moving this to main.py, ensure you add 
            # stream=True to model.track() to prevent the memory leak.
            results = model.track(
                frame,
                tracker="bytetrack.yaml",
                conf=0.4,
                persist=True,
                verbose=False 
            )

            # AGENT INSTRUCTION: Convert the annotated_frame to JPEG using 
            # cv2.imencode before yielding in the FastAPI StreamingResponse.
            annotated_frame = results[0].plot()
            boxes = results[0].boxes

            if boxes.id is not None:
                ids = boxes.id.cpu().numpy()
                classes = boxes.cls.cpu().numpy()

                for track_id, cls in zip(ids, classes):
                    track_id = int(track_id)
                    cls = int(cls)

                    if cls not in counted_ids:
                        counted_ids[cls] = set()
                    counted_ids[cls].add(track_id)

            # ---- DRAW COUNT ON VIDEO ----
            y_offset = 30
            for cls_id, ids_set in counted_ids.items():
                name = class_names[cls_id] if cls_id in class_names else str(cls_id)
                text = f"{name}: {len(ids_set)}"
                cv2.putText(
                    annotated_frame,
                    text,
                    (20, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (0, 255, 0),
                    2
                )
                y_offset += 30

            cv2.imshow("Traffic Monitoring", annotated_frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
                
    except KeyboardInterrupt:
        print("Interrupted by user.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # AGENT INSTRUCTION: Ensure cap.release() is called in the 
        # 'finally' block of the FastAPI generator to free the camera.
        if 'cap' in locals() and cap is not None:
            cap.release()
        cv2.destroyAllWindows()
        print("Resources released.")

if __name__ == "__main__":
    main()