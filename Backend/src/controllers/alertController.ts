import { Request, Response } from 'express';
import pool from '../config/db';

export const getAlerts = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM emergency_alerts WHERE status = $1 ORDER BY timestamp DESC', ['ACTIVE']);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ message: 'Server error fetching alerts' });
  }
};

export const createAlert = async (req: Request, res: Response) => {
  const { type, location, title, eta, priority } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO emergency_alerts (type, location, title, eta, priority) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [type, location, title, eta, priority || 'medium']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ message: 'Server error creating alert' });
  }
};
