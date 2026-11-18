import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import { ApiError } from './common/errors/api-error.js';
import { rateLimitInterceptor } from './common/rate-limiter/rate-limiter.service.js';
import { authRoutes } from './routes/auth.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { transactionRoutes } from './routes/transaction.routes.js';
import { goalRoutes } from './routes/goal.routes.js';
import { notificationRoutes } from './routes/notification.routes.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false, // Clean test output
    trustProxy: true
  });

  // Security Headers
  app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  });

  // Cookies for Secure Sessions
  app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'lets-track-it-cookie-secret-key-enterprise-32chars',
    parseOptions: {}
  });

  // Cross-Origin Resource Sharing
  app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Requested-With']
  });

  // Global Rate Limiting Interceptor with RFC headers
  app.addHook('preHandler', rateLimitInterceptor);

  // Health Check
  const healthHandler = async () => ({
    status: 'HEALTHY',
    service: "Let's Track It API Server",
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
  app.get('/health', healthHandler);
  app.get('/api/v1/health', healthHandler);

  // Domain API Routes
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(userRoutes, { prefix: '/api/v1/users' });
  app.register(transactionRoutes, { prefix: '/api/v1/transactions' });
  app.register(goalRoutes, { prefix: '/api/v1/goals' });
  app.register(notificationRoutes, { prefix: '/api/v1/notifications' });

  // Custom Not Found Handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      status: 404,
      error: 'NOT_FOUND',
      message: `Endpoint ${request.method} ${request.url} was not found on this server.`,
      timestamp: new Date().toISOString()
    });
  });

  // Central Error Handler complying with RFC 7807 problem details
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      if (error.statusCode === 429 && error.retryAfter !== undefined) {
        reply.header('Retry-After', error.retryAfter.toString());
      }
      reply.status(error.statusCode).send(error.toResponse());
      return;
    }

    const statusCode = (error as any).statusCode || 500;
    reply.status(statusCode).send({
      status: statusCode,
      error: error.name || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected internal error occurred',
      timestamp: new Date().toISOString()
    });
  });

  return app;
}
