from ultralytics import YOLO

model = YOLO("best.pt")

model.track(
    source="traffic.mp4",
    tracker="bytetrack.yaml",
    conf=0.4,
    persist=True,
    show=True,
    save=True
)

