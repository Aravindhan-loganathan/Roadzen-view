import { Request, Response } from 'express';
import pool from '../config/db';

export const createReport = async (req: any, res: Response): Promise<void> => {
  try {
    const { type, severity, description, location } = req.body;
    const userId = req.user.id;  // ✅ From JWT token

    if (!type || !severity || !description || !location) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const result = await pool.query(
      'INSERT INTO reports (user_id, type, severity, description, location, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, type, severity, description, location, 'pending']
    );

    res.status(201).json({
      message: 'Report created successfully',
      report: result.rows[0],
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ 
      message: 'Failed to create report', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export const getMyReports = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;  // ✅ From JWT token

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const result = await pool.query(
      'SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get my reports error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch reports', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export const getAllReports = async (req: any, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT r.*, u.name, u.email FROM reports r JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get all reports error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch reports', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export const markReportInProgress = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      res.status(400).json({ message: 'Report ID required' });
      return;
    }

    const result = await pool.query(
      'UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status || 'in_progress', id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Report not found' });
      return;
    }

    res.json({
      message: 'Report updated successfully',
      report: result.rows[0],
    });
  } catch (error) {
    console.error('Mark report error:', error);
    res.status(500).json({ message: 'Failed to update report' });
  }
};
