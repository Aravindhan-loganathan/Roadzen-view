from ultralytics import YOLO

model = YOLO("epoch10.pt")

model.track(
    source="http://192.168.137.137:8080",
    tracker="bytetrack.yaml",
    conf=0.4,
    persist=True,
    show=True,
    save=True
)

