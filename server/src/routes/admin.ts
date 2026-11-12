import { Router, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import {
  checkAdminPassword,
  createLoginRateLimiter,
  requireAdmin,
  signAdminToken,
} from '../auth.js';
import { toParticipant, type ParticipantRow } from '../mappers.js';

const MIN_PARTICIPANTS_KEY = 'min_participants';
const CSV_HEADER = 'Nome,Email,Token,Data Cadastro,Amigo Chocolate';

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

interface AdminRow extends ParticipantRow {
  matched_with_name: string | null;
}

// Escapa para CSV (aspas duplicadas) e neutraliza formula injection.
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function createAdminRouter(db: Database.Database): Router {
  const router = Router();
  const limiter = createLoginRateLimiter();

  const selectAll = db.prepare(
    `SELECT p.id, p.name, p.email, p.token, p.created_at, p.matched_with,
            p.preferred_chocolate, p.dislikes, m.name AS matched_with_name
       FROM participants p
       LEFT JOIN participants m ON m.id = p.matched_with
      ORDER BY p.created_at ASC, p.rowid ASC`,
  );
  const upsertConfig = db.prepare(
    'INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  );
  const clearMatches = db.prepare('UPDATE participants SET matched_with = NULL');
  const resetTx = db.transaction(() => {
    clearMatches.run();
  });

  function listParticipants() {
    return (selectAll.all() as AdminRow[]).map((row) =>
      toParticipant(row, { matchedWithName: row.matched_with_name ?? undefined }),
    );
  }

  router.post('/login', (req: Request, res: Response) => {
    const key = req.ip ?? 'unknown';
    if (limiter.isBlocked(key)) {
      res.status(429).json({ message: 'Muitas tentativas. Tente novamente mais tarde.' });
      return;
    }

    const body = (req.body ?? {}) as { password?: unknown };
    if (!checkAdminPassword(body.password)) {
      limiter.recordFailure(key);
      res.status(401).json({ success: false });
      return;
    }

    limiter.reset(key);
    res.json({ success: true, token: signAdminToken() });
  });

  router.get('/participants', requireAdmin, (_req: Request, res: Response) => {
    res.json(listParticipants());
  });

  router.get('/export', requireAdmin, (_req: Request, res: Response) => {
    const rows = listParticipants().map((p) =>
      [
        csvCell(p.name),
        csvCell(p.email),
        csvCell(p.token),
        csvCell(formatDate(p.createdAt)),
        csvCell(p.matchedWithName ?? ''),
      ].join(','),
    );
    const csv = '﻿' + [CSV_HEADER, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="participantes.csv"');
    res.send(csv);
  });

  router.put('/config', requireAdmin, (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { minParticipants?: unknown };
    const value = body.minParticipants;
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 2) {
      throw new HttpError(400, 'Número mínimo deve ser pelo menos 2');
    }
    upsertConfig.run(MIN_PARTICIPANTS_KEY, String(value));
    res.json({ success: true });
  });

  // Mesmo comportamento de reset_draw: limpa so os pares, mantem os participantes.
  router.post('/reset', requireAdmin, (_req: Request, res: Response) => {
    resetTx();
    res.json({ success: true });
  });

  return router;
}
