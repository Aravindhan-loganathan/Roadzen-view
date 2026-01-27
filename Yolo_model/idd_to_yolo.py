import os
import xml.etree.ElementTree as ET
import shutil
from tqdm import tqdm

BASE = "IDD_Detection"

IMG_ROOT = os.path.join(BASE, "JPEGImages")
ANN_ROOT = os.path.join(BASE, "Annotations")

TRAIN_LIST = os.path.join(BASE, "train.txt")
VAL_LIST = os.path.join(BASE, "val.txt")

OUT_BASE = "dataset"

# Create folders
for s in ["train", "val"]:
    os.makedirs(f"{OUT_BASE}/images/{s}", exist_ok=True)
    os.makedirs(f"{OUT_BASE}/labels/{s}", exist_ok=True)

# Vehicle classes
class_map = {
    "car": 0,
    "motorcycle": 1,
    "bus": 2,
    "truck": 3,
    "autorickshaw": 4
}

def convert(split_file, split_name):

    with open(split_file) as f:
        lines = f.read().splitlines()

    count = 0

    for line in tqdm(lines):

        line = line.strip()

        parts = line.split("/")

        cam_type = parts[0]
        seq_folder = parts[1]
        image_name = parts[2]

        img_path = os.path.join(
            IMG_ROOT, cam_type, seq_folder, image_name + ".jpg"
        )

        ann_path = os.path.join(
            ANN_ROOT, cam_type, seq_folder, image_name + ".xml"
        )

        if not os.path.exists(img_path) or not os.path.exists(ann_path):
            continue

        tree = ET.parse(ann_path)
        root = tree.getroot()

        size = root.find("size")
        w = float(size.find("width").text)
        h = float(size.find("height").text)

        # Copy image
        shutil.copy2(img_path, f"{OUT_BASE}/images/{split_name}/")

        label_path = f"{OUT_BASE}/labels/{split_name}/{image_name}.txt"

        with open(label_path, "w") as out:

            for obj in root.findall("object"):

                label = obj.find("name").text

                if label not in class_map:
                    continue

                bbox = obj.find("bndbox")

                xmin = float(bbox.find("xmin").text)
                ymin = float(bbox.find("ymin").text)
                xmax = float(bbox.find("xmax").text)
                ymax = float(bbox.find("ymax").text)

                x_center = ((xmin + xmax) / 2) / w
                y_center = ((ymin + ymax) / 2) / h
                bw = (xmax - xmin) / w
                bh = (ymax - ymin) / h

                out.write(
                    f"{class_map[label]} {x_center} {y_center} {bw} {bh}\n"
                )

        # Remove empty label files
        if os.path.getsize(label_path) == 0:
            os.remove(label_path)
            continue

        count += 1

    print(f"{split_name} samples converted:", count)


# Run conversion
convert(TRAIN_LIST, "train")
convert(VAL_LIST, "val")

print("IDD → YOLO conversion DONE successfully.")
