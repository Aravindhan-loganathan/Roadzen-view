import { Request, Response } from 'express';
import pool from '../config/db';

export const getSignals = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM traffic_signals ORDER BY id ASC');
    
    // Map database columns to frontend expected format
    const signals = result.rows.map(signal => ({
      id: signal.id,
      name: signal.location,
      currentGreen: signal.current_green,
      countdown: signal.countdown,
      status: signal.status,
      congestionLevel: signal.congestion_level.toLowerCase(),
      lat: signal.latitude ? parseFloat(signal.latitude) : null,
      lng: signal.longitude ? parseFloat(signal.longitude) : null
    }));

    res.json(signals);
  } catch (error) {
    console.error('Error fetching signals:', error);
    res.status(500).json({ message: 'Server error fetching signals' });
  }
};

// Optional: Endpoint to update a signal (useful for Admin control later)
export const updateSignal = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { currentGreen, countdown, congestionLevel, name, lat, lng, status } = req.body;

  try {
    await pool.query(
      'UPDATE traffic_signals SET current_green = COALESCE($1, current_green), countdown = COALESCE($2, countdown), congestion_level = COALESCE($3, congestion_level), location = COALESCE($4, location), latitude = COALESCE($5, latitude), longitude = COALESCE($6, longitude), status = COALESCE($7, status), updated_at = NOW() WHERE id = $8',
      [currentGreen, countdown, congestionLevel?.toUpperCase(), name, lat, lng, status, id]
    );
    res.json({ message: 'Signal updated successfully' });
  } catch (error) {
    console.error('Error updating signal:', error);
    res.status(500).json({ message: 'Server error updating signal' });
  }
};

export const createSignal = async (req: Request, res: Response) => {
  const { name, lat, lng, congestionLevel } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO traffic_signals (location, latitude, longitude, congestion_level) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, lat, lng, congestionLevel?.toUpperCase() || 'LOW']
    );
    
    const row = result.rows[0];
    const newSignal = {
      id: row.id,
      name: row.location,
      currentGreen: row.current_green,
      countdown: row.countdown,
      status: row.status,
      congestionLevel: row.congestion_level ? row.congestion_level.toLowerCase() : 'low',
      lat: row.latitude !== null ? parseFloat(row.latitude) : null,
      lng: row.longitude !== null ? parseFloat(row.longitude) : null
    };

    res.status(201).json(newSignal);
  } catch (error) {
    console.error('Error creating signal:', error);
    res.status(500).json({ message: 'Server error creating signal' });
  }
};

export const deleteSignal = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM traffic_signals WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Signal not found' });
    }

    res.json({ message: 'Signal deleted successfully' });
  } catch (error) {
    console.error('Error deleting signal:', error);
    res.status(500).json({ message: 'Server error deleting signal' });
  }
};
