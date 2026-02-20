import gymnasium as gym
from gymnasium import spaces
import traci
import sumolib
import numpy as np
import os
import sys

# --- IRC:93-1985 CONSTANTS ---
MIN_GREEN_TIME = 16
MAX_GREEN_TIME = 120  
AMBER_TIME = 2

class IndianTrafficEnv(gym.Env):
    """
    Custom RL Environment for SUMO that enforces Indian Traffic Standards.
    Features:
    - Action Space: 0 (Keep), 1 (Switch)
    - Observation: Queue, Wait Time, Downstream Density
    - Rewards: Queue Minimization, Starvation Penalty, Gridlock Penalty
    """
    def __init__(self, sumo_cfg_file, tls_ids, use_gui=False):
        super(IndianTrafficEnv, self).__init__()
        self.sumo = traci 
        self.sumo_cfg = sumo_cfg_file
        self.tls_ids = tls_ids 
        self.use_gui = use_gui
        self.step_length = 1.0
        
        # State tracking for EVERY traffic light
        self.tls_state = {
            tls_id: {
                "phase_time": 0,
                "current_phase": 0,
                "last_action": 0
            } for tls_id in self.tls_ids
        }

        # Actions: 0=Keep, 1=Switch (for each TLS)
        self.action_space = spaces.MultiDiscrete([2] * len(self.tls_ids))

        # Observation Space:
        # We track 3 metrics per lane: (Queue, Wait Time, Downstream Density)
        # We assume max 4 incoming lanes per intersection for simplicity in the vector.
        # 3 metrics * 4 lanes = 12 inputs per TLS.
        self.obs_dim = len(self.tls_ids) * 12 
        self.observation_space = spaces.Box(
            low=0, high=9999, shape=(self.obs_dim,), dtype=np.float32
        )

        self.sumo_cmd = None
        self.first_start = True

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        
        if self.first_start:
            # Change "sumo" to "sumo-gui" if you want to see the map
            sumo_binary = "sumo-gui" if self.use_gui else "sumo"
            
            self.sumo_cmd = [
                sumo_binary, 
                "-c", self.sumo_cfg, 
                "--no-step-log", "true", 
                "--waiting-time-memory", "10000",
                "--tripinfo-output", "rl_out.xml",
                "--emission-output", "emissions.xml",
                "--end", "48700",
                "--time-to-teleport", "-1"
            ]
            
            print(f"Starting SUMO with command: {self.sumo_cmd}")
            traci.start(self.sumo_cmd)
            self.first_start = False
        else:
            try:
                # traci.load takes the arguments excluding the binary name
                traci.load(self.sumo_cmd[1:])
            except Exception as e:
                print(f"Error resetting SUMO: {e}. Restarting...")
                traci.close()
                traci.start(self.sumo_cmd)
        
        # Initialize internal state
        for tls in self.tls_ids:
            try:
                current_phase = traci.trafficlight.getPhase(tls)
                self.tls_state[tls] = {
                    "phase_time": 0, 
                    "current_phase": current_phase, 
                    "last_action": 0
                }
            except:
                print(f"Warning: Could not init state for TLS {tls}")
        
        return self._get_observation(), {}

    def step(self, actions):
        # Apply actions for all traffic lights
        for i, tls_id in enumerate(self.tls_ids):
            action = actions[i]
            timer = self.tls_state[tls_id]["phase_time"]
            
            # --- 1. Check if we MUST switch (Max Green Limit) ---
            if timer >= MAX_GREEN_TIME:
                self._switch_phase(tls_id)
                continue

            # --- 2. Check if we CAN switch (Min Green Limit) ---
            if action == 1:
                if timer >= MIN_GREEN_TIME:
                    self._switch_phase(tls_id)
                else:
                    # Tried to switch too early -> Forced to Keep
                    self.tls_state[tls_id]["phase_time"] += self.step_length
            else:
                # Action 0 (Keep)
                self.tls_state[tls_id]["phase_time"] += self.step_length

        # Run simulation
        traci.simulationStep()

        # Gather results
        obs = self._get_observation()
        reward = self._calculate_reward()
        
        # Check termination
        terminated = (traci.simulation.getMinExpectedNumber() <= 0)
        truncated = False
        
        return obs, reward, terminated, truncated, {}

    def _switch_phase(self, tls_id):
        current_phase = traci.trafficlight.getPhase(tls_id)
        
        # Get definitions to safely find the next GREEN phase
        try:
            logic = traci.trafficlight.getCompleteRedYellowGreenDefinition(tls_id)[0]
            num_phases = len(logic.phases)
        except:
            print(f"Error getting logic for {tls_id}")
            return

        # Start searching from the next phase
        new_phase = (current_phase + 1) % num_phases
        
        # SKIP YELLOW/RED LOGIC:
        # We loop until we find a phase that has 'G' (Priority) or 'g' (Green).
        # This prevents the RL agent from getting stuck in a Yellow/Red state 
        # where it can't make decisions (because those phases have fixed durations).
        found_green = False
        for _ in range(num_phases):
            state = logic.phases[new_phase].state
            if 'G' in state or 'g' in state:
                found_green = True
                break
            new_phase = (new_phase + 1) % num_phases
            
        # Fallback if no green found (shouldn't happen in standard TLS)
        if not found_green:
            new_phase = (current_phase + 1) % num_phases

        traci.trafficlight.setPhase(tls_id, new_phase)
        self.tls_state[tls_id]["phase_time"] = 0 
        self.tls_state[tls_id]["current_phase"] = new_phase

    def _get_observation(self):
        obs = []
        for tls_id in self.tls_ids:
            lanes = traci.trafficlight.getControlledLanes(tls_id)
            
            # Temporary lists for this intersection
            queues = []
            waits = []
            downstream = []
            
            for lane in lanes:
                # 1. Queue Length
                queues.append(traci.lane.getLastStepHaltingNumber(lane))
                
                # 2. Waiting Time
                waits.append(traci.lane.getWaitingTime(lane))
                
                # 3. Downstream Density (Gridlock Prevention)
                # We check the lane immediately AFTER this one.
                links = traci.lane.getLinks(lane)
                if len(links) > 0:
                    next_lane_id = links[0][0]
                    # Occupancy is 0.0 to 1.0, we scale to percentage 0-100
                    occ = traci.lane.getLastStepOccupancy(next_lane_id) * 100
                    downstream.append(occ)
                else:
                    downstream.append(0)
            
            # --- PADDING ---
            # To make the vector fixed-size for the Neural Network, we pad or truncate
            # We assume a standard 4-way intersection (approx 4 incoming edges).
            # If complex intersection, we take top 4 busiest or just first 4.
            TARGET_LANES = 4
            
            if len(queues) > TARGET_LANES:
                queues = queues[:TARGET_LANES]
                waits = waits[:TARGET_LANES]
                downstream = downstream[:TARGET_LANES]
            
            while len(queues) < TARGET_LANES:
                queues.append(0)
                waits.append(0)
                downstream.append(0)
            
            obs.extend(queues)
            obs.extend(waits)
            obs.extend(downstream)
            
        return np.array(obs, dtype=np.float32)

    def _calculate_reward(self):
        # Constants for Reward Weights
        ALPHA = 1.0  # Weight for Total Queue
        BETA = 1.0   # Weight for Starvation (Max Wait)
        GAMMA = 50.0 # Weight for Blocking (Gridlock)

        total_queue = 0
        max_wait_time = 0
        blocking_penalty = 0

        # 1. Global Metrics (Total Queue & Max Wait)
        # We scan ALL vehicles to find the "unhappiest" driver
        try:
            vehicles = traci.vehicle.getIDList()
            for veh in vehicles:
                w = traci.vehicle.getWaitingTime(veh)
                if w > max_wait_time:
                    max_wait_time = w
        except:
            pass # Safety for empty simulation

        # 2. TLS Specific Metrics (Queues & Blocking)
        for tls_id in self.tls_ids:
            lanes = traci.trafficlight.getControlledLanes(tls_id)
            for lane in lanes:
                # Add to total queue
                total_queue += traci.lane.getLastStepHaltingNumber(lane)

                # Check Gridlock: Are we sending cars into a full lane?
                links = traci.lane.getLinks(lane)
                if len(links) > 0:
                     next_lane = links[0][0]
                     # If downstream is jam-packed (>80% full)
                     if traci.lane.getLastStepOccupancy(next_lane) > 0.8:
                         # AND we have cars trying to push in
                         if traci.lane.getLastStepVehicleNumber(lane) > 0:
                             blocking_penalty += 1  # Add 1 penalty point per lane blocked

        # 3. Starvation Factor (Panic Mode)
        # If any car waits > 100s, the penalty multiplies
        starvation_factor = 1.0
        if max_wait_time > 100:
            starvation_factor = 5.0 

        # 4. Final Calculation
        # Formula: -1 * (Queue_Cost + Starvation_Cost + Gridlock_Cost)
        raw_reward = -1 * ( 
            (ALPHA * total_queue) + 
            (BETA * max_wait_time * starvation_factor) + 
            (GAMMA * blocking_penalty) 
        )
        
        # 5. Reward Scaling (CRITICAL FIX)
        # Divides by 100 to keep values between -1 and -100 typically.
        # Prevents "Exploding Gradient" in PPO.
        scaled_reward = raw_reward / 1000.0
        
        return scaled_reward

    def close(self):
        traci.close()