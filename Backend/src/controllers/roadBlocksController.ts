import { Request, Response } from 'express';
import pool from '../config/db';

/**
 * GET all roadblocks
 */
export const getRoadblocks = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM roadblocks ORDER BY id ASC');

    const roadblocks = result.rows.map(r => ({
      id: r.id,
      reason: r.reason,
      lat: parseFloat(r.latitude),
      lng: parseFloat(r.longitude),
      created_at: r.created_at,
      updated_at: r.updated_at
    }));

    res.json(roadblocks);
  } catch (error) {
    console.error('Error fetching roadblocks:', error);
    res.status(500).json({ message: 'Server error fetching roadblocks' });
  }
};

/**
 * CREATE roadblock (ADMIN)
 */
export const createRoadblock = async (req: Request, res: Response) => {
  try {
    const { reason, lat, lng } = req.body;

    if (!reason || !lat || !lng) {
      return res.status(400).json({ message: 'Reason, latitude, and longitude are required' });
    }

    const result = await pool.query(
      `
      INSERT INTO roadblocks (reason, latitude, longitude)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [reason, lat, lng]
    );

    res.status(201).json({
      message: 'Roadblock created',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating roadblock:', error);
    res.status(500).json({ message: 'Failed to create roadblock' });
  }
};

/**
 * UPDATE roadblock
 */
export const updateRoadblock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, lat, lng } = req.body;

    const result = await pool.query(
      `
      UPDATE roadblocks
      SET reason = COALESCE($1, reason),
          latitude = COALESCE($2, latitude),
          longitude = COALESCE($3, longitude),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
      `,
      [reason ?? null, lat ?? null, lng ?? null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Roadblock not found' });
    }

    res.json({
      message: 'Roadblock updated',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating roadblock:', error);
    res.status(500).json({ message: 'Failed to update roadblock' });
  }
};

/**
 * DELETE roadblock (ADMIN)
 */
export const deleteRoadblock = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM roadblocks WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Roadblock not found' });
    }

    res.json({ message: 'Roadblock removed' });
  } catch (error) {
    console.error('Error deleting roadblock:', error);
    res.status(500).json({ message: 'Server error deleting roadblock' });
  }
};
