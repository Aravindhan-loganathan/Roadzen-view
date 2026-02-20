from stable_baselines3 import PPO
from traffic_env import IndianTrafficEnv
import sumolib
import os
import sys

# 0. Auto-detect Configuration
config_file = "city.sumocfg"
net_file = "city.net.xml"

if not os.path.exists(config_file):
    print(f"Config '{config_file}' not found. Please ensure it exists.")
    sys.exit(1)

# 1. Discover Traffic Lights using sumolib (Static Analysis)
print("Analyzing network for Traffic Lights...")
try:
    net = sumolib.net.readNet(net_file)
    tls_list = [tls.getID() for tls in net.getTrafficLights()]
    print(f"Discovered TLS IDs: {tls_list}")
except Exception as e:
    print(f"Error reading network file: {e}")
    sys.exit(1)

if not tls_list:
    print("No traffic lights found in the network!")
    sys.exit(1)

# 2. Setup Environment
# use_gui=False for faster training
print("Initializing Environment...")
env = IndianTrafficEnv(sumo_cfg_file=config_file, tls_ids=tls_list, use_gui=False)

# 3. Define the Model
# Using MlpPolicy (Multi-Layer Perceptron) because our input is a simple vector of numbers
model = PPO(
    "MlpPolicy", 
    env, 
    verbose=1, 
    learning_rate=0.0003,
    gamma=0.99
)

# 4. Train
print("Starting Training (50k steps)...")
try:
    model.learn(total_timesteps=50000) 
    model.save("indian_traffic_agent_v3_antigridlock")
    print("Training Complete. Model saved as 'indian_traffic_agent_v3_antigridlock'.")
except Exception as e:
    print(f"Training failed: {e}")
finally:
    env.close()