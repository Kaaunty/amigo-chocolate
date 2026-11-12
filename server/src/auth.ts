import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';

const TOKEN_TTL = '8h';

export function signAdminToken(): string {
  return jwt.sign({ admin: true }, config.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: TOKEN_TTL,
  });
}

// Compara em tempo constante: sha256 de ambos gera buffers de mesmo tamanho.
export function checkAdminPassword(input: unknown): boolean {
  if (typeof input !== 'string') return false;
  const a = createHash('sha256').update(input).digest();
  const b = createHash('sha256').update(config.ADMIN_PASSWORD).digest();
  return timingSafeEqual(a, b);
}

function unauthorized(res: Response): void {
  res.status(401).json({ message: 'Não autorizado' });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (typeof header !== 'string') {
    unauthorized(res);
    return;
  }
  const match = /^Bearer (\S+)$/.exec(header);
  if (!match) {
    unauthorized(res);
    return;
  }

  try {
    const payload = jwt.verify(match[1], config.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload !== 'object' || payload === null || payload.admin !== true) {
      unauthorized(res);
      return;
    }
  } catch {
    // Nunca vazar detalhes do erro do jwt
    unauthorized(res);
    return;
  }
  next();
}

export interface LoginRateLimiter {
  isBlocked(key: string): boolean;
  recordFailure(key: string): void;
  reset(key: string): void;
}

// Limitador em memoria: maximo de falhas por chave dentro de uma janela fixa.
export function createLoginRateLimiter(
  maxFailures = 10,
  windowMs = 15 * 60 * 1000,
  now: () => number = Date.now,
): LoginRateLimiter {
  const entries = new Map<string, { count: number; resetAt: number }>();

  function current(key: string) {
    const entry = entries.get(key);
    if (entry && entry.resetAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  }

  return {
    isBlocked(key) {
      const entry = current(key);
      return entry !== undefined && entry.count >= maxFailures;
    },
    recordFailure(key) {
      const entry = current(key);
      if (entry) {
        entry.count += 1;
      } else {
        entries.set(key, { count: 1, resetAt: now() + windowMs });
      }
    },
    reset(key) {
      entries.delete(key);
    },
  };
}
