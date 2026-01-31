import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface UserPayload {
    id: number;
    role: string;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        res.status(401).json({ message: 'Access token required' });
        return;
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
        req.user = verified;
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid or expired token' });
    }
};
