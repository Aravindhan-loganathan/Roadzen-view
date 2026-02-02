import urllib.request
import time

URL = "https://ultralytics.com/assets/weights/yolov8n.pt"
TARGET = "epoch10.pt"

for attempt in range(1,6):
    try:
        print(f"Downloading {URL} -> {TARGET} (attempt {attempt})...")
        urllib.request.urlretrieve(URL, TARGET)
        print("Download completed.")
        break
    except Exception as e:
        print(f"Download failed (attempt {attempt}): {e}")
        if attempt < 5:
            time.sleep(2)
        else:
            raise
