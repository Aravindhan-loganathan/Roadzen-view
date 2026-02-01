import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import pool from './config/db';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import signalRoutes from './routes/signalRoutes';
import alertRoutes from './routes/alertRoutes';
import createTables from './db/setup';
import reportRoutes from './routes/reportRoutes';
import violationRoutes from './routes/violationRoutes';
import savedLocations from './routes/savedLocations';
import emergencyVehicleRoutes from './routes/emergencyVehicleRoutes';
import roadBlocksRoutes from './routes/roadBlocksRoutes';


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
// Handle preflight requests globally via middleware (avoids route pattern parser issues)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json());

// Initialize Database Tables
createTables();

// Routes
app.use('/api', signalRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api', reportRoutes);
app.use('/api', violationRoutes);
app.use('/api', emergencyVehicleRoutes);
app.use('/api/saved-locations', savedLocations);
app.use('/api', roadBlocksRoutes);

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.send('Traffic Management System API is running...');
});

// Database Connection Test Route
app.get('/api/test-db', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'success', 
      message: 'Database connection successful', 
      timestamp: result.rows[0].now 
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
