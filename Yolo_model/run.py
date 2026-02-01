from ultralytics import YOLO
import cv2

model = YOLO("epoch10.pt").to("cuda")

cap = cv2.VideoCapture("traffic 2.mp4")

counted_ids = {}
class_names = model.names

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    results = model.track(
        frame,
        tracker="bytetrack.yaml",
        conf=0.4,
        persist=True,
        device=0,
        half=True
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

    y_offset = 30
    for cls_id, ids_set in counted_ids.items():
        text = f"{class_names[cls_id]}: {len(ids_set)}"
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

cap.release()
cv2.destroyAllWindows()
