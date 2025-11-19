import { Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { getUserById } from '../utils/supabase';
import { UserInfo, ErrorResponse } from '../types/index';

// GET /api/user/me
export const userMe = async (
  req: Request,
  res: Response<UserInfo | ErrorResponse>
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'unauthorized',
        error_description: 'Authorization header with Bearer token required',
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const payload = verifyAccessToken(token);
    if (!payload) {
      res.status(401).json({
        error: 'invalid_token',
        error_description: 'Invalid or expired access token',
      });
      return;
    }

    // Get user from Supabase
    const user = await getUserById(payload.sub);
    if (!user) {
      res.status(404).json({
        error: 'not_found',
        error_description: 'User not found',
      });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Error in userMe:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to retrieve user info',
    });
  }
};
