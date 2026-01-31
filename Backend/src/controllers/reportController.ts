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
    const limit = parseInt(req.query.limit as string) || 5; // Default to 5 per user request
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const sortBy = (req.query.sortBy as string) || 'created_at';
    const order = (req.query.order as string) || 'DESC';

    const allowedSorts = ['created_at', 'severity', 'status', 'type'];
    const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    let query = `SELECT * FROM reports WHERE user_id = $1`;
    let countQuery = `SELECT COUNT(*) FROM reports WHERE user_id = $1`;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (search) {
      const searchClause = ` AND (
        description ILIKE $${paramIndex} OR 
        type ILIKE $${paramIndex} OR 
        location ILIKE $${paramIndex}
      )`;
      query += searchClause;
      countQuery += searchClause;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add ordering
    if (safeSortBy === 'severity') {
      query += ` ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 4 
          WHEN 'high' THEN 3 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 1 
          ELSE 0 
        END ${safeOrder} `;
    } else {
      query += ` ORDER BY ${safeSortBy} ${safeOrder} `;
    }

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const countResult = await pool.query(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(query, params);

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
    const search = req.query.search as string;
    const sortBy = (req.query.sortBy as string) || 'created_at';
    const order = (req.query.order as string) || 'DESC';

    // Allowed sort columns
    const allowedSorts = ['created_at', 'severity', 'status', 'type'];
    const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let query = `
      SELECT r.*, u.name, u.email 
      FROM reports r 
      JOIN users u ON r.user_id = u.id 
    `;
    
    let countQuery = `SELECT COUNT(*) FROM reports r JOIN users u ON r.user_id = u.id`;
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      const searchClause = ` WHERE (
        r.description ILIKE $${paramIndex} OR 
        r.type ILIKE $${paramIndex} OR 
        r.location ILIKE $${paramIndex} OR
        u.name ILIKE $${paramIndex}
      )`;
      query += searchClause;
      countQuery += searchClause;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add ordering
    if (safeSortBy === 'severity') {
      // Custom ordering for severity if needed, or simple text sort
       // 'critical' > 'high' > 'medium' > 'low'
      query += ` ORDER BY 
        CASE r.severity 
          WHEN 'critical' THEN 4 
          WHEN 'high' THEN 3 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 1 
          ELSE 0 
        END ${safeOrder} `;
    } else {
      query += ` ORDER BY r.${safeSortBy} ${safeOrder} `;
    }

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const countResult = await pool.query(countQuery, params.slice(0, paramIndex - 1)); // Only search param for count
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(query, params);

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

  try {
    if (!id || isNaN(Number(id))) {
      res.status(400).json({ message: 'Invalid Report ID' });
      return;
    }

    const reportId = parseInt(id, 10);

    const checkResult = await pool.query('SELECT * FROM reports WHERE id = $1', [reportId]);
    
    if (checkResult.rows.length === 0) {
      res.status(404).json({ message: 'Report not found' });
      return;
    }

    const updateResult = await pool.query(
      'UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, reportId]
    );
    
    res.json({
      message: 'Report updated successfully',
      report: updateResult.rows[0],
    });

  } catch (error) {
    console.error(`Update transaction failed for Report ${id}:`, error);
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

  try {
    if (!id || isNaN(Number(id))) {
      res.status(400).json({ message: 'Invalid Report ID' });
      return;
    }

    const reportId = parseInt(id, 10);

    const reportResult = await pool.query('SELECT id, user_id FROM reports WHERE id = $1', [reportId]);
    
    if (reportResult.rows.length === 0) {
      res.status(404).json({ message: 'Report not found' });
      return;
    }

    const report = reportResult.rows[0];

    const isOwner = report.user_id === userId;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Not authorized to delete this report' });
      return;
    }

    await pool.query('DELETE FROM reports WHERE id = $1', [reportId]);
    
    res.json({ message: 'Report deleted successfully' });

  } catch (error) {
    console.error(`Delete transaction failed for Report ${id}:`, error);
    res.status(500).json({ 
      message: 'Failed to delete report',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};
