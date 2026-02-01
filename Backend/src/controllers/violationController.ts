import { Request, Response } from 'express';
import pool from '../config/db';

// Create a new violation
export const createViolation = async (req: Request, res: Response) => {
  try {
    const { type, vehicle_number, location, fine_amount, status = 'pending' } = req.body;

    // Validate required fields
    if (!type || !vehicle_number || !location || fine_amount === undefined) {
      return res.status(400).json({
        message: 'Missing required fields: type, vehicle_number, location, fine_amount',
      });
    }

    const result = await pool.query(
      `INSERT INTO violations (type, vehicle_number, location, fine_amount, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, type, vehicle_number, location, fine_amount, status, timestamp`,
      [type, vehicle_number, location, fine_amount, status]
    );

    res.status(201).json({
      message: 'Violation created successfully',
      violation: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating violation:', error);
    res.status(500).json({
      message: 'Failed to create violation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get all violations with optional filters
export const getViolations = async (req: Request, res: Response) => {
  try {
    const { status, type, location, dateRange, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM violations WHERE 1=1';
    const params: any[] = [];

    // Date range filter
    let dateFilterQuery = '';
    const now = new Date();
    let startDate = new Date();

    if (dateRange) {
      if (dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (dateRange === 'week') {
        // Start of this week (Monday)
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
      } else if (dateRange === 'month') {
        // Start of this month
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
      }
      dateFilterQuery = ' AND timestamp >= $' + (params.length + 1);
      query += dateFilterQuery;
      params.push(startDate);
    }

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    if (type) {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    if (location) {
      query += ` AND location = $${params.length + 1}`;
      params.push(location);
    }

    query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM violations WHERE 1=1';
    const countParams: any[] = [];

    if (dateRange) {
      countQuery += ` AND timestamp >= $${countParams.length + 1}`;
      countParams.push(startDate);
    }

    if (status) {
      countQuery += ` AND status = $${countParams.length + 1}`;
      countParams.push(status);
    }

    if (type) {
      countQuery += ` AND type = $${countParams.length + 1}`;
      countParams.push(type);
    }

    if (location) {
      countQuery += ` AND location = $${countParams.length + 1}`;
      countParams.push(location);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      violations: result.rows,
      pagination: {
        total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      },
    });
  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({
      message: 'Failed to fetch violations',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get a single violation by ID
export const getViolationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM violations WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching violation:', error);
    res.status(500).json({
      message: 'Failed to fetch violation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Update a violation
export const updateViolation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, vehicle_number, location, fine_amount, status } = req.body;

    // Build dynamic update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (type !== undefined) {
      updates.push(`type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (vehicle_number !== undefined) {
      updates.push(`vehicle_number = $${paramIndex}`);
      params.push(vehicle_number);
      paramIndex++;
    }

    if (location !== undefined) {
      updates.push(`location = $${paramIndex}`);
      params.push(location);
      paramIndex++;
    }

    if (fine_amount !== undefined) {
      updates.push(`fine_amount = $${paramIndex}`);
      params.push(fine_amount);
      paramIndex++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);
    const query = `UPDATE violations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    res.json({
      message: 'Violation updated successfully',
      violation: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating violation:', error);
    res.status(500).json({
      message: 'Failed to update violation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get all unique locations/junctions
export const getLocations = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT location FROM violations ORDER BY location ASC'
    );

    const locations = result.rows.map((row) => row.location);

    res.json({
      locations,
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({
      message: 'Failed to fetch locations',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Delete a violation
export const deleteViolation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM violations WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    res.json({ message: 'Violation deleted successfully' });
  } catch (error) {
    console.error('Error deleting violation:', error);
    res.status(500).json({
      message: 'Failed to delete violation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
