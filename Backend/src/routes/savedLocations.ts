import { Router, Request, Response } from 'express';
import pool from '../config/db';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// POST /api/saved-locations - Save a new location
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { name, latitude, longitude } = req.body;
  const userId = req.user?.id;

  if (!name || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO saved_locations (name, latitude, longitude, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, latitude, longitude, userId]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/saved-locations - Get all saved locations for the authenticated user
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user?.id;

  try {
    const result = await pool.query(
      'SELECT * FROM saved_locations WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching saved locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/saved-locations/:id - Delete a saved location
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  
  try {
    // Ensure the location belongs to the user
    const checkResult = await pool.query(
      'SELECT id FROM saved_locations WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found or unauthorized' });
    }

    await pool.query('DELETE FROM saved_locations WHERE id = $1', [id]);
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;