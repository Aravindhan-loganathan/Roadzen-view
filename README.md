# 🚦 Roadzen View

### Smart Traffic Monitoring & AI‑Driven Signal Optimization Platform

---

<p align="center">
  <strong>Real-Time Monitoring • AI Vehicle Detection • Reinforcement Learning • Smart Signal Control</strong>
</p>

---

## 📌 Overview

**Roadzen View** is an end-to-end intelligent traffic monitoring and management system designed to reduce congestion, improve signal efficiency, and enhance emergency response in urban environments.

[▶️ Watch Simulation Video](sum_sim_captures/sumo_sim%20ml%20model%20run.mp4)

The platform integrates:

* 🗺️ Live traffic visualization
* 🚗 AI-powered vehicle detection (YOLOv8)
* 🧠 Reinforcement Learning-based adaptive signal control
* 🏙️ SUMO traffic simulation for optimization
* 📊 Administrative dashboards and exportable analytics

---

# 🏗️ System Architecture

```text
                                        ┌────────────────────┐
                                        │   Public Interface │
                                        └─────────┬──────────┘
                                                  │
                                        ┌─────────▼──────────┐
                                        │   React Frontend   │
                                        └─────────┬──────────┘
                                                  │ REST APIs
                                        ┌─────────▼──────────┐
                                        │   Node.js Backend  │
                                        └─────────┬──────────┘
                                                  │
                ┌─────────────────────────────────┼─────────────────────────────────┐
                ▼                                 ▼                                 ▼
        PostgreSQL                        YOLO Detection                      SUMO RL
          Database                          (FastAPI)                        Simulation
```

---

# 🧩 Project Modules

---

## 🖥️ Backend (Node.js + TypeScript)

Handles authentication, traffic control logic, database management, and API services.

### 🔹 Tech Stack

* Node.js * TypeScript * Express.js * PostgreSQL

### 🔹 Important Files

```
src/
 ├── db/setup.ts
 ├── controllers/dashboardController.ts
 └── routes/
```

---

## 🌍 Frontend (React + Vite)

Provides interactive interfaces for both public users and administrators.

### 🔹 Tech Stack

* React + TypeScript * Vite * Tailwind CSS * shadcn-ui * React Router * Leaflet (Maps) * Recharts (Analytics) * html2pdf.js
### 🔹 Important Files

```
src/
 ├── App.tsx
 ├── pages/public/LiveMap.tsx
 ├── pages/admin/AdminDashboard.tsx
 └── services/dashboardPdfExportService.ts
```

---

## 🚘 SUMO Simulation + Reinforcement Learning

Implements adaptive traffic signal optimization using Proximal Policy Optimization (PPO).

### 🔹 Tech Stack

* Python * SUMO (Simulation of Urban Mobility) * Gymnasium * Stable-Baselines3 * NumPy


### 🔹 Important Files

```
sumo_sim/
 ├── traffic_env.py
 ├── train.py
 ├── run_inference_rl.py
 ├── randomTrips.py
 └── compare_models.py
```

---

## 🎥 YOLO Vehicle Detection Service

Provides real-time vehicle detection from video streams.

### 🔹 Tech Stack

* Ultralytics YOLOv8 * OpenCV * FastAPI * Uvicorn

### 🔹 Important Files

```
Yolo_model/
 ├── yolo_live.py
 └── main.py
```

---

# ⚙️ Installation & Setup

---

## ✅ Prerequisites

* Node.js (v18+)
* Python 3.8+
* PostgreSQL
* SUMO (configured with SUMO_HOME)
* Git

---

## 🔹 Backend Setup

```bash
cd Backend
npm install
# Copy .env.example to .env and configure database credentials
npm run dev
```

---

## 🔹 Frontend Setup

```bash
cd Frontend
npm install
npm run dev
```

---

## 🔹 SUMO Simulation

```bash
cd sumo_sim
pip install -r requirements.txt
python train.py
python run_inference_rl.py
```

---

## 🔹 YOLO Detection Service

```bash
cd Yolo_model
pip install ultralytics opencv-python fastapi uvicorn
python main.py
```

---

# 🚀 Usage Guide

1. Start Backend server
2. Start Frontend server
3. (Optional) Run SUMO simulation for optimization testing
4. Start YOLO detection service for live vehicle detection
5. Access:

   * 🌍 Public Interface
   * 🔐 Admin Dashboard

---

# 🔐 Security

* JWT-based authentication
* Role-based authorization
* Structured relational database schema
* Protected administrative routes

---

# 🧪 Development Practices

* Modular architecture
* ESLint configuration
* Vitest support
* Simulation-first validation approach

---

# 📁 Repository Structure

```text
Roadzen-View/
│
├── Backend/
├── Frontend/
├── sumo_sim/
├── Yolo_model/
└── README.md
```

---

<p align="center">
  <strong>Built for scalable urban mobility.</strong>
</p>
