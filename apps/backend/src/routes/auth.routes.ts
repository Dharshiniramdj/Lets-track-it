import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../modules/auth/auth.service.js';
import { AuthGuard } from '../common/guards/auth.guard.js';
import { ApiError } from '../common/errors/api-error.js';

const SignUpSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address format'),
  password: z.string().min(10, 'Password must be at least 10 characters long'),
  currencyPreference: z.string().optional()
});

const VerifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be exactly 6 digits')
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required')
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token is required')
});

const ForgotPasswordSchema = z.object({
  email: z.string().email()
});

const ResetPasswordSchema = z.object({
  email: z.string().email(),
  resetToken: z.string().min(10),
  newPassword: z.string().min(10)
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/signup', async (request, reply) => {
    const parse = SignUpSchema.safeParse(request.body);
    if (!parse.success) {
      const details = parse.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw ApiError.unprocessableEntity('Validation failed on sign up payload', details);
    }

    const result = await AuthService.signUp(parse.data);
    reply.status(201).send(result);
  });

  fastify.post('/verify-otp', async (request, reply) => {
    const parse = VerifyOtpSchema.safeParse(request.body);
    if (!parse.success) {
      throw ApiError.unprocessableEntity('Invalid OTP verification payload', [
        { field: 'otp', message: 'OTP must be 6 digits' }
      ]);
    }

    const result = await AuthService.verifyEmailOtp(parse.data);
    if (typeof (reply as any).setCookie === 'function' && result.tokens?.refreshToken) {
      (reply as any).setCookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
    }
    reply.send(result);
  });

  fastify.post('/login', async (request, reply) => {
    const parse = LoginSchema.safeParse(request.body);
    if (!parse.success) {
      throw ApiError.unprocessableEntity('Validation failed on login payload', [
        { field: 'credentials', message: 'Email and password are required' }
      ]);
    }

    const result = await AuthService.login(parse.data);
    if (typeof (reply as any).setCookie === 'function' && result.tokens?.refreshToken) {
      (reply as any).setCookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });
    }
    reply.send(result);
  });

  fastify.post('/refresh', async (request, reply) => {
    const parse = RefreshSchema.safeParse(request.body);
    if (!parse.success) {
      throw ApiError.unprocessableEntity('Invalid refresh token request', [
        { field: 'refreshToken', message: 'Valid refresh token string required' }
      ]);
    }

    const result = await AuthService.refreshTokens(parse.data.refreshToken);
    reply.send(result);
  });

  fastify.post('/biometric-login', async (request, reply) => {
    const { userId, signature, challenge } = (request.body as any) || {};
    if (!userId || !signature || !challenge) {
      throw ApiError.unprocessableEntity('Missing biometric authentication parameters', [
        { field: 'biometrics', message: 'userId, signature, and challenge required' }
      ]);
    }

    const result = await AuthService.biometricLogin({ userId, signature, challenge });
    reply.send(result);
  });

  fastify.post('/forgot-password', async (request, reply) => {
    const parse = ForgotPasswordSchema.safeParse(request.body);
    if (!parse.success) {
      throw ApiError.unprocessableEntity('Invalid email', [
        { field: 'email', message: 'Valid email required' }
      ]);
    }

    const result = await AuthService.forgotPassword(parse.data);
    reply.send(result);
  });

  fastify.post('/reset-password', async (request, reply) => {
    const parse = ResetPasswordSchema.safeParse(request.body);
    if (!parse.success) {
      throw ApiError.unprocessableEntity('Invalid reset password payload', [
        { field: 'newPassword', message: 'Password must be at least 10 characters' }
      ]);
    }

    const result = await AuthService.resetPassword(parse.data);
    reply.send(result);
  });

  // Current authenticated user session (never returns password hashes or secrets)
  fastify.get('/me', { preHandler: [AuthGuard.authenticate] }, async (request, reply) => {
    const user = (request as any).user;
    const profile = await AuthService.getCurrentUserProfile(user.id);
    reply.send({ user: profile });
  });

  // Logout & session invalidation
  fastify.post('/logout', { preHandler: [AuthGuard.authenticate] }, async (request, reply) => {
    const user = (request as any).user;
    const refreshToken = (request.body as any)?.refreshToken || (request as any).cookies?.refreshToken;
    if (refreshToken) {
      await AuthService.revokeRefreshToken(refreshToken);
    }
    if (typeof (reply as any).clearCookie === 'function') {
      (reply as any).clearCookie('refreshToken', { path: '/' });
    }
    reply.send({ success: true, message: 'Logged out successfully' });
  });
}
