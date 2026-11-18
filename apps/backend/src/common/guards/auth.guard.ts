import jwt from 'jsonwebtoken';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ApiError } from '../errors/api-error.js';
import { SupabaseAuthService } from '../../modules/auth/supabase-auth.service.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName?: string;
  currencyPreference?: string;
}

export interface JwtTokenPayload {
  sub: string;
  email: string;
  currencyPreference?: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'lets-track-it-enterprise-secret-key-change-in-prod-32bytes';

export class AuthGuard {
  public static signAccessToken(payload: { sub: string; email: string; currencyPreference?: string }): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '15m',
      algorithm: 'HS256'
    });
  }

  public static verifyAccessToken(token: string): JwtTokenPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtTokenPayload;
      return decoded;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Access token has expired');
      }
      throw ApiError.unauthorized('Invalid or forged access token');
    }
  }

  public static async authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authorization header with Bearer token is required');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw ApiError.unauthorized('Bearer token cannot be empty');
    }

    // Server-side verification using SupabaseAuthService
    const verifiedUser = await SupabaseAuthService.verifyAccessToken(token);
    (request as any).user = {
      id: verifiedUser.id,
      email: verifiedUser.email,
      fullName: verifiedUser.fullName,
      currencyPreference: verifiedUser.currencyPreference || 'INR'
    };
  }
}
