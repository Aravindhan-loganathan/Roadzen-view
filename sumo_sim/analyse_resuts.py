import xml.etree.ElementTree as ET
import sys
import os

def calculate_metrics(xml_file):
    if not os.path.exists(xml_file):
        print(f"Error: File '{xml_file}' not found.")
        return

    tree = ET.parse(xml_file)
    root = tree.getroot()

    total_waiting_time = 0.0
    total_time_loss = 0.0
    total_travel_time = 0.0
    vehicle_count = 0

    # Loop through every vehicle trip in the file
    for trip in root.findall('tripinfo'):
        vehicle_count += 1
        total_waiting_time += float(trip.get('waitingTime'))
        total_time_loss += float(trip.get('timeLoss'))
        total_travel_time += float(trip.get('duration'))

    if vehicle_count == 0:
        print("No vehicles finished the simulation.")
        return

    # Calculate Averages
    avg_wait = total_waiting_time / vehicle_count
    avg_loss = total_time_loss / vehicle_count
    avg_travel = total_travel_time / vehicle_count

    print("="*40)
    print(f"  METRICS REPORT: {xml_file}")
    print("="*40)
    print(f"Total Vehicles:    {vehicle_count}")
    print(f"Avg Waiting Time:  {avg_wait:.2f} seconds")
    print(f"Avg Time Loss:     {avg_loss:.2f} seconds")
    print(f"Avg Travel Time:   {avg_travel:.2f} seconds")
    print("="*40)

if __name__ == "__main__":
    # Default to 'out.xml' if no argument is given
    filename = sys.argv[1] if len(sys.argv) > 1 else "out.xml"
    calculate_metrics(filename)