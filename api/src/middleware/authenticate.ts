import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      user?: { userId: number };
    }
  }
}

// TODO: Move JWT_SECRET to .env file
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; iat: number; exp: number };
    req.user = { userId: decoded.userId };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ message: 'Unauthorized: Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    } else {
        console.error('Authentication error:', error);
        return res.status(500).json({ message: 'Internal server error during authentication' });
    }
  }
}; 