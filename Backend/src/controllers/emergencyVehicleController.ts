import { Request, Response } from 'express';
import pool from '../config/db';

/**
 * GET all emergency vehicles
 */
export const getEmergencyVehicles = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM emergency_vehicles ORDER BY id ASC'
    );

    const vehicles = result.rows.map(v => ({
      id: v.id,
      type: v.type,
      identifier: v.identifier,
      priority: v.priority,
      lat: parseFloat(v.latitude),
      lng: parseFloat(v.longitude),
    }));

    res.json(vehicles);
  } catch (error) {
    console.error('Error fetching emergency vehicles:', error);
    res.status(500).json({ message: 'Server error fetching emergency vehicles' });
  }
};

/**
 * CREATE emergency vehicle (ADMIN)
 */
export const createEmergencyVehicle = async (req: Request, res: Response) => {
  try {
    const { type, identifier, priority, lat, lng } = req.body;

    const result = await pool.query(
      `
      INSERT INTO emergency_vehicles
      (type, identifier, priority, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [type, identifier, priority, lat, lng]
    );

    res.status(201).json({
      message: 'Emergency vehicle created',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating emergency vehicle:', error);
    res.status(500).json({ error: 'Failed to create emergency vehicle' });
  }
};

/**
 * UPDATE emergency vehicle (location / priority)
 * Used for live movement simulation
 */
export const updateEmergencyVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let { lat, lng, priority, type, identifier } = req.body;

    if (priority && typeof priority === 'string') priority = priority.toLowerCase();
    if (type && typeof type === 'string') type = type.toLowerCase();

    const result = await pool.query(
      `
      UPDATE emergency_vehicles
      SET latitude = COALESCE($1, latitude),
          longitude = COALESCE($2, longitude),
          priority = COALESCE($3, priority),
          type = COALESCE($4, type),
          identifier = COALESCE($5, identifier),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
      `,
      [lat ?? null, lng ?? null, priority ?? null, type ?? null, identifier ?? null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Emergency vehicle not found' });
    }

    res.json({
      message: 'Emergency vehicle updated',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating emergency vehicle:', error);
    res.status(500).json({ error: 'Failed to update emergency vehicle' });
  }
};

/**
 * DELETE emergency vehicle (ADMIN)
 */
export const deleteEmergencyVehicle = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM emergency_vehicles WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Emergency vehicle not found' });
    }

    res.json({ message: 'Emergency vehicle removed' });
  } catch (error) {
    console.error('Error deleting emergency vehicle:', error);
    res.status(500).json({ message: 'Server error deleting emergency vehicle' });
  }
};
