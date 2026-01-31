import { Router } from 'express';
import pool from '../config/db';

const router = Router();

// POST /api/saved-locations - Save a new location
router.post('/', async (req, res) => {
  const { name, latitude, longitude, user_id } = req.body;

  if (!name || !latitude || !longitude || !user_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO saved_locations (name, latitude, longitude, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, latitude, longitude, user_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/saved-locations - Get all saved locations for a user
router.get('/', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM saved_locations WHERE user_id = $1 ORDER BY created_at DESC',
      [user_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching saved locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/saved-locations/:id - Delete a saved location
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query('DELETE FROM saved_locations WHERE id = $1', [id]);
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;