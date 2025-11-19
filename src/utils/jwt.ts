import jwt from 'jsonwebtoken';
import { JWTPayload, RefreshTokenPayload } from '../types/index';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export const generateAccessToken = (
  userId: string,
  email: string,
  clientId: string
): string => {
  const payload: JWTPayload = {
    sub: userId,
    email,
    client_id: clientId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + getExpirySeconds(JWT_EXPIRY),
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
};

export const generateRefreshToken = (userId: string): string => {
  const payload: RefreshTokenPayload = {
    sub: userId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + getExpirySeconds(JWT_REFRESH_EXPIRY),
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
};

export const verifyAccessToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as RefreshTokenPayload;
    return decoded.type === 'refresh' ? decoded : null;
  } catch (error) {
    return null;
  }
};

export const getExpirySeconds = (expiry: string): number => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 3600; // default 1 hour

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 3600;
  }
};

export const getTokenExpirySeconds = (): number => {
  return getExpirySeconds(JWT_EXPIRY);
};
