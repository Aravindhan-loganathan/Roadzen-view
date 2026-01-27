import { Request, Response } from 'express';
import pool from '../config/db';

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    // Run queries in parallel for performance
    const [signalsRes, violationsRes, alertsRes] = await Promise.all([
      pool.query('SELECT congestion_level FROM traffic_signals'),
      pool.query('SELECT COUNT(*) FROM violations'),
      pool.query('SELECT COUNT(*) FROM emergency_alerts WHERE status = $1', ['ACTIVE'])
    ]);

    const signals = signalsRes.rows;
    
    // Calculate stats
    const totalSignals = signals.length;
    const heavyTraffic = signals.filter(s => s.congestion_level === 'HIGH').length;
    const moderateTraffic = signals.filter(s => s.congestion_level === 'MEDIUM').length;
    const smoothRoads = signals.filter(s => s.congestion_level === 'LOW').length;
    
    const totalViolations = parseInt(violationsRes.rows[0].count);
    const activeAlerts = parseInt(alertsRes.rows[0].count);

    // Mocking total vehicles for now (or you can add a 'lanes' table later)
    const totalVehicles = 12450; 

    res.json({
      totalVehicles,
      activeCameras: totalSignals,
      heavyTraffic,
      moderateTraffic,
      smoothRoads,
      totalViolations,
      emergencyEvents: activeAlerts
    });
  } catch (error) {
    console.error('Dashboard Summary Error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
};

export const getHourlyTraffic = async (req: Request, res: Response) => {
  // In a real app, this would query a 'traffic_logs' table grouped by hour
  // Returning mock data compatible with the frontend chart
  const mockHourly = [
    { hour: '06:00', vehicles: 120 },
    { hour: '09:00', vehicles: 850 },
    { hour: '12:00', vehicles: 600 },
    { hour: '15:00', vehicles: 450 },
    { hour: '18:00', vehicles: 900 },
    { hour: '21:00', vehicles: 300 },
  ];
  res.json(mockHourly);
};
