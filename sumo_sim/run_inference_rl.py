import time
import traci
from stable_baselines3 import PPO
import os
from traffic_env import IndianTrafficEnv

# ===============================
# CONFIG
# ===============================
MODEL_PATH = "indian_traffic_agent_v3_antigridlock"
SUMO_CONFIG = "city.sumocfg"   # use your cleaned config
GUI = True
SEED = 42

# ===============================
# Helper: auto-detect TLS
# ===============================
def get_tls_ids(cfg_file):
    import sumolib
    net_file = "city.net.xml"
    if not os.path.exists(net_file):
        print("Error: city.net.xml not found for TLS discovery.")
        return []

    net = sumolib.net.readNet(net_file)
    tls_ids = [tls.getID() for tls in net.getTrafficLights()]
    return tls_ids

# ===============================
# MAIN SIMULATION LOOP
# ===============================
def run_simulation():

    print(f"\nLoading SUMO config: {SUMO_CONFIG}")

    TLS_LIST = get_tls_ids(SUMO_CONFIG)
    if len(TLS_LIST) == 0:
        print("❌ No traffic lights found in network.")
        return

    print("Detected Traffic Lights:", TLS_LIST)

    env = IndianTrafficEnv(
        sumo_cfg_file=SUMO_CONFIG,
        tls_ids=TLS_LIST,
        use_gui=GUI
    )

    print(f"Loading model: {MODEL_PATH}")
    try:
        model = PPO.load(MODEL_PATH)
    except FileNotFoundError:
        print("❌ Model not found. Train first.")
        return

    obs, _ = env.reset(seed=SEED)

    done = False
    step_counter = 0
    total_reward = 0
    last_state = ""

    print("\n--- STARTING RL SIMULATION (NO HARDWARE) ---")

    try:
        while not done:

            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(action)

            # 🔥 Get SUMO traffic light state string for first TLS
            current_state = env.sumo.trafficlight.getRedYellowGreenState(TLS_LIST[0])

            # We don't send to ESP32 here, just track state if needed
            if current_state != last_state:
                # You could log the state change here if you wanted
                # print(f"State changed: {current_state}")
                last_state = current_state

            total_reward += reward
            step_counter += 1
            done = terminated or truncated

            # Status print every 100 steps
            if step_counter % 100 == 0:
                print(
                    f"Step: {step_counter} | "
                    f"Reward: {reward:.2f} | "
                    f"Total: {total_reward:.2f} | "
                    f"Action: {action} | "
                    f"TLS State: {current_state}"
                )

    finally:
        env.close()

    print("\n--- FINISHED ---")
    print(f"Steps: {step_counter}")
    print(f"Total Reward: {total_reward:.2f}")

# ===============================
# ENTRY POINT
# ===============================
if __name__ == "__main__":
    run_simulation()
