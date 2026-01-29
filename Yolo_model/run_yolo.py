from ultralytics import YOLO

# Load your trained model
model = YOLO("best.pt")

# Run prediction on video
model.predict(
    source="traffic.mp4",
    conf=0.4,
    save=True,
    show=True   # This will open video window with boxes
)
