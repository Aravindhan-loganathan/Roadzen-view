import xml.etree.ElementTree as ET
import sys
import os

def get_metrics(xml_file):
    """Parses a SUMO tripinfo file and returns average metrics."""
    if not os.path.exists(xml_file):
        print(f"Error: File '{xml_file}' not found.")
        return None

    tree = ET.parse(xml_file)
    root = tree.getroot()

    total_wait = 0.0
    total_travel = 0.0
    total_loss = 0.0
    count = 0

    for trip in root.findall('tripinfo'):
        count += 1
        total_wait += float(trip.get('waitingTime'))
        total_travel += float(trip.get('duration'))
        total_loss += float(trip.get('timeLoss'))

    if count == 0:
        return None

    return {
        "wait": total_wait / count,
        "travel": total_travel / count,
        "loss": total_loss / count,
        "count": count
    }

def compare(baseline_file, rl_file):
    print(f"Loading Baseline: {baseline_file}")
    base = get_metrics(baseline_file)
    
    print(f"Loading RL Model: {rl_file}")
    rl = get_metrics(rl_file)

    if not base or not rl:
        print("Error: Could not read one of the files.")
        return

    print("\n" + "="*65)
    print(f"{'METRIC':<20} | {'BASELINE':<10} | {'RL MODEL':<10} | {'IMPROVEMENT'}")
    print("-" * 65)

    metrics_list = [
        ("Avg Waiting Time", "wait", "s"),
        ("Avg fuel consumption", "travel", "l"),
        ("Avg carbon emmisions", "loss", "per mton")
    ]

    for label, key, unit in metrics_list:
        val_b = base[key]
        val_r = rl[key]
        
        # Calculate Percentage Improvement
        # (Baseline - RL) / Baseline * 100
        diff = val_b - val_r
        pct = (diff / val_b) * 100
        
        # formatting: Green if positive (improvement), Red if negative
        sign = "+" if pct > 0 else ""
        
        print(f"{label:<20} | {val_b:<8.2f} {unit} | {val_r:<8.2f} {unit} | {sign}{pct:.2f}%")

    print("-" * 65)
    print(f"{'Total Vehicles':<20} | {base['count']:<10} | {rl['count']:<10} |")
    print("="*65)

if __name__ == "__main__":
    # You can change these filenames if yours are different
    compare("baseline_out.xml", "rl_out.xml")