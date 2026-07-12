import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { JWTPayload } from '../types/auth.types';

export class TokenHelper {
  /**
   * Generates Access Token and Refresh Token pair with unique correlation JTIs.
   */
  static generateTokens(payload: {
    id: string;
    email: string;
    role: 'Admin' | 'Asset Manager' | 'Department Head' | 'Employee';
    organizationId: string;
  }) {
    const jti = crypto.randomUUID();

    const accessToken = jwt.sign(
      {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        organizationId: payload.organizationId,
        jti
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m'
      } as SignOptions
    );

    const refreshToken = jwt.sign(
      { id: payload.id, jti },
      process.env.JWT_REFRESH_SECRET!,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d'
      } as SignOptions
    );

    return { accessToken, refreshToken, jti };
  }

  /**
   * Verifies the authenticity of an Access Token and returns the decoded JWTPayload.
   */
  static verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
  }

  /**
   * Verifies the authenticity of a Refresh Token.
   */
  static verifyRefreshToken(token: string): { id: string; jti: string } {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: string; jti: string };
  }
}
export default TokenHelper;
