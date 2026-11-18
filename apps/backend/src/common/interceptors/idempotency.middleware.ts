import { FastifyRequest, FastifyReply } from 'fastify';

interface CachedIdempotencyResponse {
  statusCode: number;
  body: any;
  timestamp: number;
}

export class IdempotencyManager {
  private static cache = new Map<string, CachedIdempotencyResponse>();
  private static TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  public static get(key: string): CachedIdempotencyResponse | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.TTL_MS) {
      this.cache.delete(key);
      return undefined;
    }
    return entry;
  }

  public static set(key: string, statusCode: number, body: any): void {
    this.cache.set(key, {
      statusCode,
      body,
      timestamp: Date.now()
    });
  }

  public static clear(): void {
    this.cache.clear();
  }
}

export async function handleIdempotency(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const idempotencyKey = request.headers['idempotency-key'] as string;
  if (!idempotencyKey) {
    return false; // No key provided, proceed normally
  }

  const cached = IdempotencyManager.get(idempotencyKey);
  if (cached) {
    reply.header('X-Cache-Lookup', 'HIT');
    reply.header('Idempotency-Replay', 'true');
    reply.status(cached.statusCode).send(cached.body);
    return true; // Request handled from cache
  }

  return false;
}
