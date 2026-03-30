import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';

const userService = new UserService();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization header is required',
        timestamp: new Date().toISOString(),
      },
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token is required',
        timestamp: new Date().toISOString(),
      },
    });
  }

  try {
    const decoded = userService.verifyToken(token);
    const resolvedUser = await userService.getUserByIdentity(decoded.userId, decoded.username);

    if (!resolvedUser) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'User no longer exists',
          timestamp: new Date().toISOString(),
        },
      });
    }

    (req as any).user = {
      userId: resolvedUser.id,
      username: resolvedUser.username,
    };
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
      },
    });
  }
};
