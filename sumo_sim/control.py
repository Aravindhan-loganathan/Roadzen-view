import traci
import sys
import os

# Check for SUMO_HOME
if 'SUMO_HOME' in os.environ:
    tools = os.path.join(os.environ['SUMO_HOME'], 'tools')
    sys.path.append(tools)
else:
    sys.exit("Please declare environment variable 'SUMO_HOME'")

def get_controlled_lanes(tls_id):
    """
    Map each phase index to the set of lanes that have a green light.
    Returns: dict { phase_index: [lane_ids...] }
    """
    controlled_links = traci.trafficlight.getControlledLinks(tls_id)
    logic = traci.trafficlight.getAllProgramLogics(tls_id)[0]
    phases = logic.phases
    
    phase_lane_map = {}
    
    for phase_idx, phase in enumerate(phases):
        state = phase.state
        green_lanes = set()
        
        for signal_idx, char in enumerate(state):
            # Detect Green (G = Priority, g = Yield)
            if char.lower() == 'g':
                if signal_idx < len(controlled_links):
                    links = controlled_links[signal_idx]
                    for link in links:
                        green_lanes.add(link[0])
                        
        phase_lane_map[phase_idx] = list(green_lanes)
        
    return phase_lane_map

def run():
    print("Starting Robust TraCI Control Loop...")
    
    # 1. Dynamically detect all traffic lights
    tls_ids = traci.trafficlight.getIDList()
    print(f"Detected {len(tls_ids)} Traffic Lights: {tls_ids}")
    
    # 2. Pre-compute phase-to-lane mapping
    tls_map = {}
    for tls in tls_ids:
        tls_map[tls] = get_controlled_lanes(tls)
    
    # --- Control Constants ---
    MIN_GREEN_TIME = 15      # Minimum time to stay in a phase
    DECISION_INTERVAL = 5    # How often to check (seconds)
    STARVATION_THRESHOLD = 60 # Max wait time before forcing a switch
    
    # --- STATE TRACKING ---
    last_switch_time = {tls: 0 for tls in tls_ids}
    phase_last_served = {tls: {} for tls in tls_ids}
    
    # Initialize "last served" times
    for tls in tls_ids:
        for p_idx in tls_map[tls].keys():
            phase_last_served[tls][p_idx] = 0

    step = 0
    
    while traci.simulation.getMinExpectedNumber() > 0:
        traci.simulationStep()
        
        current_time = traci.simulation.getTime()
        
        # Only make decisions every few seconds
        if step % DECISION_INTERVAL != 0:
            step += 1
            continue

        for tls in tls_ids:
            # --- 1. Check Minimum Green Time ---
            time_since_switch = current_time - last_switch_time[tls]
            if time_since_switch < MIN_GREEN_TIME:
                continue
                
            current_phase = traci.trafficlight.getPhase(tls)
            
            # Update 'last served' for the current phase so it doesn't starve
            phase_last_served[tls][current_phase] = current_time

            # --- 2. Check for Starvation ---
            starving_phase = -1
            max_starvation_time = -1
            phase_lanes = tls_map[tls]
            
            for p_idx in phase_lanes.keys():
                if p_idx == current_phase: 
                    continue
                
                # Check how long since this phase was last green
                last_time = phase_last_served[tls].get(p_idx, 0)
                wait_time = current_time - last_time
                
                if wait_time > STARVATION_THRESHOLD:
                    if wait_time > max_starvation_time:
                        max_starvation_time = wait_time
                        starving_phase = p_idx
            
            target_phase = -1
            
            if starving_phase != -1:
                # Force switch due to starvation
                target_phase = starving_phase
            else:
                # --- 3. Queue-Based Optimization ---
                best_phase_idx = current_phase
                max_queue_score = -1
                
                for p_idx, lanes in phase_lanes.items():
                    score = 0
                    for lane in lanes:
                        score += traci.lane.getLastStepHaltingNumber(lane)
                    
                    # Basic logic: Pick phase with highest number of stopped cars
                    if score > max_queue_score:
                        max_queue_score = score
                        best_phase_idx = p_idx
                
                if best_phase_idx != current_phase:
                    target_phase = best_phase_idx

            # --- 4. Apply Switch ---
            if target_phase != -1 and target_phase != current_phase:
                traci.trafficlight.setPhase(tls, target_phase)
                last_switch_time[tls] = current_time
                phase_last_served[tls][target_phase] = current_time

        step += 1

    print("Simulation finished.")
    traci.close()

# --- FIXED MAIN BLOCK ---
if __name__ == "__main__":
    # 1. Define the BASIC command
    # Use "sumo-gui" to see the simulation, or "sumo" for command line only
    sumo_binary = "sumo-gui" 
    
    # 2. Define the arguments clearly
    # IMPORTANT: Only list your config file ONCE here.
    sumo_cmd =[
    "sumo-gui",
    "-n", "city.net.xml",       # Point directly to your network file
    "-r", "routes.rou.xml",     # Point directly to your route file
    "--tripinfo-output", "out.xml",
    "--start"
]
    
    # 3. Debug Print
    print("------------------------------------------------")
    print("Starting SUMO with arguments:", sumo_cmd)
    print("------------------------------------------------")
    
    # 4. Start
    try:
        traci.start(sumo_cmd)
        run()
    except Exception as e:
        print(f"FATAL ERROR: {e}")
        try: traci.close()
        except: pass