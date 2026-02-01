import { Request, Response } from 'express';
import pool from '../config/db';

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    // Run queries in parallel for performance
    const [signalsRes, violationsRes, alertsRes, reportsRes, totalAlertsRes] = await Promise.all([
      pool.query('SELECT congestion_level FROM traffic_signals'),
      pool.query('SELECT COUNT(*) FROM violations'),
      pool.query('SELECT * FROM emergency_alerts WHERE status = $1', ['ACTIVE']),
      pool.query('SELECT COUNT(*) FROM reports'),
      pool.query('SELECT COUNT(*) FROM emergency_alerts')
    ]);

    const signals = signalsRes.rows;

    // Calculate stats
    const totalSignals = signals.length;
    const heavyTraffic = signals.filter(s => s.congestion_level === 'HIGH').length;
    const moderateTraffic = signals.filter(s => s.congestion_level === 'MEDIUM').length;
    const smoothRoads = signals.filter(s => s.congestion_level === 'LOW').length;

    const totalViolations = parseInt(violationsRes.rows[0].count);
    const totalReports = parseInt(reportsRes.rows[0].count);
    const totalAlerts = parseInt(totalAlertsRes.rows[0].count);

    // Check for high priority alerts (ambulance/firetruck)
    const hasHighPriorityAlert = alertsRes.rows.some((a: any) =>
      ['ambulance', 'firetruck'].includes(a.type.toLowerCase())
    );

    // Mocking total vehicles for now (or you can add a 'lanes' table later)
    const totalVehicles = 12450;

    // Congested lanes based on heavy traffic signals
    const congestedLanes = heavyTraffic;

    res.json({
      totalVehicles,
      activeCameras: totalSignals,
      heavyTraffic,
      moderateTraffic,
      smoothRoads,
      totalViolations,
      totalReports,
      emergencyEvents: totalAlerts,
      congestedLanes,
      hasHighPriorityAlert
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
    { hour: '6 AM', vehicles: 1200 },
    { hour: '7 AM', vehicles: 3500 },
    { hour: '8 AM', vehicles: 5800 },
    { hour: '9 AM', vehicles: 6200 },
    { hour: '10 AM', vehicles: 4100 },
    { hour: '11 AM', vehicles: 3800 },
    { hour: '12 PM', vehicles: 4200 },
    { hour: '1 PM', vehicles: 4500 },
    { hour: '2 PM', vehicles: 4000 },
    { hour: '3 PM', vehicles: 4300 },
    { hour: '4 PM', vehicles: 5200 },
    { hour: '5 PM', vehicles: 6800 },
    { hour: '6 PM', vehicles: 7200 },
    { hour: '7 PM', vehicles: 5500 },
    { hour: '8 PM', vehicles: 3200 },
    { hour: '9 PM', vehicles: 2100 },
  ];
  res.json(mockHourly);
};
