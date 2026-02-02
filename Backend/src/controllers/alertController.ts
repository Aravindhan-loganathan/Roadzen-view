import { Request, Response } from 'express';
import pool from '../config/db';

/**
 * Compose alerts from existing resources (no emergency_alerts table)
 * - Emergency Vehicles -> vehicle alerts
 * - Roadblocks -> closure alerts
 * - Reports (open) -> user/admin reports
 */
export const getAlerts = async (req: Request, res: Response) => {
  try {
    const [vehiclesRes, roadblocksRes, reportsRes] = await Promise.all([
      pool.query('SELECT id, type, identifier, priority, latitude, longitude, created_at FROM emergency_vehicles'),
      pool.query('SELECT id, reason, latitude, longitude, created_at FROM roadblocks'),
      pool.query("SELECT id, type, severity, description, location, created_at FROM reports WHERE status <> 'completed' ORDER BY created_at DESC")
    ]);

    const vehicleAlerts = vehiclesRes.rows.map((v: any) => ({
      id: `ev-${v.id}`,
      type: v.type,
      title: v.identifier || `${v.type}`,
      location: `${parseFloat(v.latitude)},${parseFloat(v.longitude)}`,
      eta: null,
      priority: v.priority || 'medium',
      timestamp: v.created_at,
      latitude: parseFloat(v.latitude),
      longitude: parseFloat(v.longitude)
    }));

    const roadblockAlerts = roadblocksRes.rows.map((r: any) => ({
      id: `rb-${r.id}`,
      type: 'closure',
      title: r.reason,
      location: `${parseFloat(r.latitude)},${parseFloat(r.longitude)}`,
      eta: null,
      priority: 'medium',
      timestamp: r.created_at,
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      impact: 'roadblock'
    }));

    const reportAlerts = reportsRes.rows.map((rep: any) => {
      // Try to parse location for lat/lng if available in "lat,lng" format
      let latitude: number | undefined;
      let longitude: number | undefined;
      if (typeof rep.location === 'string' && rep.location.includes(',')) {
        const [latStr, lngStr] = rep.location.split(',').map((s: string) => s.trim());
        const latNum = Number(latStr);
        const lngNum = Number(lngStr);
        if (!isNaN(latNum) && !isNaN(lngNum)) {
          latitude = latNum;
          longitude = lngNum;
        }
      }

      return {
        id: `rep-${rep.id}`,
        type: rep.type,
        title: rep.description || rep.type,
        location: rep.location,
        eta: null,
        priority: rep.severity || 'medium',
        timestamp: rep.created_at,
        latitude,
        longitude
      };
    });

    const alerts = [...vehicleAlerts, ...roadblockAlerts, ...reportAlerts];

    // sort by timestamp desc
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ message: 'Server error fetching alerts' });
  }
};

export const createAlert = async (req: Request, res: Response) => {
  const { type, location, title, eta, priority } = req.body;

  if (!type || !location || !title) {
    return res.status(400).json({ message: 'type, location, and title are required' });
  }

  try {
    // Create a report record instead (reports table exists and is suited for incident-like alerts)
    const severity = priority || 'medium';
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized: user id missing' });

    const result = await pool.query(
      `INSERT INTO reports (user_id, type, severity, description, location) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, type, severity, title, location]
    );

    const rep = result.rows[0];

    const alert = {
      id: `rep-${rep.id}`,
      type: rep.type,
      title: rep.description,
      location: rep.location,
      eta: null,
      priority: rep.severity || 'medium',
      timestamp: rep.created_at
    };

    res.status(201).json(alert);
  } catch (error) {
    console.error('Error creating alert (reports):', error);
    res.status(500).json({ message: 'Server error creating alert' });
  }
};
