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
      [userId, type, severity.toLowerCase(), description, location, 'pending']
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM reports WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      'SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    res.json({
      reports: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM reports');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      'SELECT r.*, u.name, u.email FROM reports r JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({
      reports: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all reports error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch reports', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export const updateReportStatus = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  console.log(`[updateReportStatus] Request received for Report ID: ${id}, New Status: ${status}`);

  try {
    if (!id || isNaN(Number(id))) {
      console.warn(`[updateReportStatus] Invalid Report ID: ${id}`);
      res.status(400).json({ message: 'Invalid Report ID' });
      return;
    }

    const reportId = parseInt(id, 10);

    // 1. Check if report exists
    const checkResult = await pool.query('SELECT * FROM reports WHERE id = $1', [reportId]);
    
    if (checkResult.rows.length === 0) {
      console.warn(`[updateReportStatus] Report ${reportId} not found in database.`);
      res.status(404).json({ message: 'Report not found' });
      return;
    }

    // 2. Update status
    const updateResult = await pool.query(
      'UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, reportId]
    );

    console.log(`[updateReportStatus] Successfully updated Report ${reportId} to ${status}`);
    
    res.json({
      message: 'Report updated successfully',
      report: updateResult.rows[0],
    });

  } catch (error) {
    console.error(`[updateReportStatus] Transaction failed for Report ${id}:`, error);
    res.status(500).json({ 
      message: 'Failed to update report', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export const deleteReport = async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  console.log(`[deleteReport] Request received for Report ID: ${id} from User: ${userId} (${userRole})`);

  try {
    if (!id || isNaN(Number(id))) {
      console.warn(`[deleteReport] Invalid Report ID: ${id}`);
      res.status(400).json({ message: 'Invalid Report ID' });
      return;
    }

    const reportId = parseInt(id, 10);

    // 1. Check if report exists and get ownership info
    const reportResult = await pool.query('SELECT id, user_id FROM reports WHERE id = $1', [reportId]);
    
    if (reportResult.rows.length === 0) {
      console.warn(`[deleteReport] Report ${reportId} not found.`);
      res.status(404).json({ message: 'Report not found' });
      return;
    }

    const report = reportResult.rows[0];

    // 2. Authorization Check: Allow if Admin OR if the user owns the report
    const isOwner = report.user_id === userId;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
      console.warn(`[deleteReport] Access Denied. User ${userId} tried to delete report ${reportId} owned by ${report.user_id}`);
      res.status(403).json({ message: 'Not authorized to delete this report' });
      return;
    }

    // 3. Perform Deletion
    await pool.query('DELETE FROM reports WHERE id = $1', [reportId]);
    
    console.log(`[deleteReport] Successfully deleted Report ${reportId}`);
    res.json({ message: 'Report deleted successfully' });

  } catch (error) {
    console.error(`[deleteReport] Transaction failed for Report ${id}:`, error);
    res.status(500).json({ 
      message: 'Failed to delete report',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};
