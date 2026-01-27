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
  const { currentGreen, countdown, congestionLevel } = req.body;

  try {
    await pool.query(
      'UPDATE traffic_signals SET current_green = $1, countdown = $2, congestion_level = $3, updated_at = NOW() WHERE id = $4',
      [currentGreen, countdown, congestionLevel?.toUpperCase(), id]
    );
    res.json({ message: 'Signal updated successfully' });
  } catch (error) {
    console.error('Error updating signal:', error);
    res.status(500).json({ message: 'Server error updating signal' });
  }
};
