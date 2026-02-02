import { Request, Response } from 'express';
import pool from '../config/db';

// System Settings
export const getSystemSettings = async (_req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT key, value FROM system_settings');
        const settings = result.rows.reduce((acc: any, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        res.json(settings);
    } catch (error) {
        console.error('Get system settings error:', error);
        res.status(500).json({ message: 'Server error fetching system settings' });
    }
};

export const updateSystemSettings = async (req: Request, res: Response) => {
    const settings = req.body; // Expecting object like { refresh_interval: '5', ... }

    try {
        const queries = Object.entries(settings).map(([key, value]) => {
            return pool.query(
                'INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
                [key, value]
            );
        });

        await Promise.all(queries);
        res.json({ message: 'System settings updated successfully' });
    } catch (error) {
        console.error('Update system settings error:', error);
        res.status(500).json({ message: 'Server error updating system settings' });
    }
};

// User Settings (Notifications etc)
export const getUserSettings = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    try {
        const result = await pool.query(
            'SELECT emergency_alerts_enabled, system_alerts_enabled, violation_alerts_enabled FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            emergencyAlerts: result.rows[0].emergency_alerts_enabled,
            systemAlerts: result.rows[0].system_alerts_enabled,
            violationAlerts: result.rows[0].violation_alerts_enabled,
        });
    } catch (error) {
        console.error('Get user settings error:', error);
        res.status(500).json({ message: 'Server error fetching user settings' });
    }
};

export const updateUserSettings = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { emergencyAlerts, systemAlerts, violationAlerts } = req.body;

    try {
        await pool.query(
            `UPDATE users SET 
        emergency_alerts_enabled = $1, 
        system_alerts_enabled = $2, 
        violation_alerts_enabled = $3 
      WHERE id = $4`,
            [emergencyAlerts, systemAlerts, violationAlerts, userId]
        );

        res.json({ message: 'User preferences updated successfully' });
    } catch (error) {
        console.error('Update user settings error:', error);
        res.status(500).json({ message: 'Server error updating user preferences' });
    }
};
