import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role, location,phone, vehicleNumber } = req.body;

  if (!location || !phone) {
    res.status(400).json({ message: 'Location is required' });
    return;
  }
  
  try {
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    if (userCheck.rows.length > 0) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      `INSERT INTO users (name, email, password, role, location, phone, vehicle_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, location, phone, vehicle_number`,
      [name, email, hashedPassword, role || 'public', location, phone , vehicleNumber || null]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    // 1. Check user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];

    // 2. Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    // 3. Generate Token
    const token = jwt.sign(
      { id: user.id, role: user.role },  // ✅ Changed from newUser to user
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        phone: user.phone,
        vehicleNumber: user.vehicle_number,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const updateProfile = async (req: any, res: Response): Promise<void> => {
  const { name, location, phone, vehicleNumber } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  if (!name || !location || !phone) {
    res.status(400).json({
      message: 'Name, location and phone are required',
    });
    return;
  }

  try {
    const result = await pool.query(
      `
      UPDATE users
      SET
        name = $1,
        location = $2,
        phone = $3,
        vehicle_number = $4
      WHERE id = $5
      RETURNING id, name, email, role, location, phone, vehicle_number
      `,
      [name, location, phone, vehicleNumber || null, userId]
    );
  

    // Pass only name and userId. Email check logic removed.
   // const result = await pool.query(updateQuery, [name, location, phone, vehicleNumber, userId]);

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        ...result.rows[0],
        vehicleNumber: result.rows[0].vehicle_number,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  try {
    const result = await pool.query('SELECT id, name, email, role, location, phone, vehicle_number FROM users WHERE id = $1', [userId]);
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  try {
    // 1. Get user to check current password
    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    if (!isMatch) {
      res.status(400).json({ message: 'Incorrect current password' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error changing password' });
  }
};


export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        email,
        role,
        location,
        phone,
        vehicle_number,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};
