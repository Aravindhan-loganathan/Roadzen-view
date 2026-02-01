from ultralytics import YOLO
import cv2
import os
import time

# Configuration
# Replace the URL below with your live stream URL
SOURCE_URL = "http://10.47.146.127:8080" # http://192.168.1.25:8080/video
TARGET_WIDTH = 640  # Resize frames to this width for performance

# Force TCP for RTSP to prevent packet drop/gray frames on unstable connections
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

def initialize_stream(url):
    """
    Initializes the video stream with robust error handling and configuration.
    """
    # URL Verification: Append /video if it looks like a raw IP Webcam URL
    # IP Webcam typically uses http://<ip>:8080/video for the stream
    if url.startswith("http") and url.split(":")[-1].isdigit() and not url.endswith("/video"):
        print(f"Warning: URL '{url}' looks like a raw IP. Appending '/video' for better compatibility.")
        url += "/video"
    elif url.startswith("http") and url.endswith(("/", ":8080", ":8080/")):
         # Handle trailing slashes or just port
         url = url.rstrip("/")
         if not url.endswith("/video"):
             url += "/video"
             print(f"Auto-corrected URL to: {url}")

    print(f"Connecting to stream: {url}...")
    
    # Explicitly use FFMPEG backend
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    
    # Set a timeout for opening the stream (5000ms = 5s)
    try:
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)
    except Exception:
        pass # Not all backends support this property

    # Optimization: constant buffer size for real-time
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
        print("Please check your network connection and the URL.")
        return

    counted_ids = {}
    class_names = model.names

    print("Stream started. Press 'q' to exit.")

    try:
        while True:
            # Read frame
            ret, frame = cap.read()
            
            # Reconnection Logic
            if not ret:
                print("Stream ended or connection lost. Attempting to reconnect...")
                
                reconnected = False
                for attempt in range(1, 4):
                    print(f"Reconnection attempt {attempt}/3 in 2 seconds...")
                    time.sleep(2)
                    
                    # Release old instance
                    cap.release()
                    
                    # Try to reconnect
                    cap = initialize_stream(SOURCE_URL)
                    
                    if cap.isOpened():
                        # Verify we can actually read a frame
                        ret, frame = cap.read()
                        if ret:
                            print("Reconnection successful!")
                            reconnected = True
                            break
                        else:
                            print("Connected but failed to read frame.")
                    
                if not reconnected:
                    print("Could not reconnect after 3 attempts. Exiting.")
                    break
                else:
                    # Proceed with processing the new frame
                    pass

            if frame is None:
                continue

            # Resize frame if necessary for performance
            h, w = frame.shape[:2]
            if w > TARGET_WIDTH:
                scale = TARGET_WIDTH / w
                new_h = int(h * scale)
                frame = cv2.resize(frame, (TARGET_WIDTH, new_h))

            # Run YOLO + ByteTrack
            results = model.track(
                frame,
                tracker="bytetrack.yaml",
                conf=0.4,
                persist=True,
                verbose=False # Reduce console spam
            )

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

            # SHOW WINDOW
            cv2.imshow("Traffic Monitoring", annotated_frame)

            # PRESS Q TO EXIT
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("Exiting...")
                break
                
    except KeyboardInterrupt:
        print("Interrupted by user.")
    except Exception as e:
        print(f"An error occurred: {e}")
        # import traceback; traceback.print_exc() # Uncomment for debugging
    finally:
        # Cleanup
        if 'cap' in locals() and cap is not None:
            cap.release()
        cv2.destroyAllWindows()
        print("Resources released.")

if __name__ == "__main__":
    main()