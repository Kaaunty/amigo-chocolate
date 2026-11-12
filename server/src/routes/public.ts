import { randomBytes, randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import { config } from '../config.js';
import { toParticipant, type Participant, type ParticipantRow } from '../mappers.js';

type MatchedParticipant = Pick<Participant, 'id' | 'name' | 'preferredChocolate' | 'dislikes'>;

const MAX_NAME_LENGTH = 255;
const MAX_EMAIL_LENGTH = 255;
const MAX_TEXT_LENGTH = 1000;
const MAX_TOKEN_ATTEMPTS = 5;
const MIN_PARTICIPANTS_KEY = 'min_participants';

// Erro com status HTTP; o error handler de app.ts responde { message } para status < 500.
class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

interface CountRow {
  total: number;
}

interface ConfigRow {
  value: string;
}

interface RegisterBody {
  name?: unknown;
  email?: unknown;
  preferredChocolate?: unknown;
  dislikes?: unknown;
}

interface ValidatedInput {
  name: string;
  email: string;
  preferredChocolate: string | null;
  dislikes: string | null;
}

function readText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} inválido`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new HttpError(400, `${field} deve ter no máximo ${maxLength} caracteres`);
  }
  return trimmed === '' ? null : trimmed;
}

function validateRegisterBody(body: RegisterBody): ValidatedInput {
  if (typeof body.name !== 'string' || body.name.trim() === '') {
    throw new HttpError(400, 'Nome é obrigatório');
  }
  const name = body.name.trim();
  if (name.length > MAX_NAME_LENGTH) {
    throw new HttpError(400, `Nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`);
  }

  const emailRaw = readText(body.email, 'E-mail', MAX_EMAIL_LENGTH);
  const email = emailRaw === null ? '' : emailRaw.toLowerCase();

  return {
    name,
    email,
    preferredChocolate: readText(body.preferredChocolate, 'Chocolate preferido', MAX_TEXT_LENGTH),
    dislikes: readText(body.dislikes, 'Campo "não gosta"', MAX_TEXT_LENGTH),
  };
}

function errorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

export function createPublicRouter(db: Database.Database): Router {
  const router = Router();

  const insertParticipant = db.prepare(
    'INSERT INTO participants (id, name, email, token, preferred_chocolate, dislikes) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const selectById = db.prepare(
    'SELECT id, name, email, token, created_at, matched_with, preferred_chocolate, dislikes FROM participants WHERE id = ?',
  );
  const selectByToken = db.prepare(
    'SELECT id, name, email, token, created_at, matched_with, preferred_chocolate, dislikes FROM participants WHERE token = ?',
  );
  const selectMatched = db.prepare(
    'SELECT id, name, preferred_chocolate, dislikes FROM participants WHERE id = ?',
  );
  const countAll = db.prepare('SELECT COUNT(*) AS total FROM participants');
  const countUnmatched = db.prepare(
    'SELECT COUNT(*) AS total FROM participants WHERE matched_with IS NULL',
  );
  const selectConfig = db.prepare('SELECT value FROM config WHERE key = ?');

  // Insere com id e token gerados aqui. Colisao de token (UNIQUE) gera novo token;
  // colisao de nome (UNIQUE) vira 409.
  function insertWithUniqueToken(input: ValidatedInput): string {
    for (let attempt = 1; attempt <= MAX_TOKEN_ATTEMPTS; attempt++) {
      const id = randomUUID();
      const token = randomBytes(16).toString('hex');
      try {
        insertParticipant.run(
          id,
          input.name,
          input.email,
          token,
          input.preferredChocolate,
          input.dislikes,
        );
        return id;
      } catch (err) {
        if (errorCode(err) !== 'SQLITE_CONSTRAINT_UNIQUE') throw err;

        const message = err instanceof Error ? err.message : '';
        if (message.includes('participants.name')) {
          throw new HttpError(409, 'Este nome já está cadastrado');
        }
        if (message.includes('participants.token')) {
          continue;
        }
        throw err;
      }
    }
    throw new Error('Não foi possível gerar um token único');
  }

  router.post('/api/participants', (req: Request, res: Response) => {
    const body = (req.body ?? {}) as RegisterBody;
    const input = validateRegisterBody(body);
    const id = insertWithUniqueToken(input);

    const row = selectById.get(id) as ParticipantRow;
    const participant: Participant = toParticipant(row);
    const link = `${config.PUBLIC_URL}/participante/${participant.token}`;

    res.status(201).json({ participant, link });
  });

  router.get('/api/participants/:token', (req: Request, res: Response) => {
    const token = String(req.params.token);
    const row = selectByToken.get(token) as ParticipantRow | undefined;
    if (!row) {
      throw new HttpError(404, 'Participante não encontrado');
    }

    let matchedParticipant: MatchedParticipant | undefined;
    let matchedWithName: string | undefined;

    if (row.matched_with) {
      const matched = selectMatched.get(row.matched_with) as ParticipantRow | undefined;
      if (matched) {
        matchedWithName = matched.name;
        // Somente dados nao sensiveis: sem token/email/matchedWith (evita percorrer o ciclo)
        matchedParticipant = { id: matched.id, name: matched.name };
        if (matched.preferred_chocolate) {
          matchedParticipant.preferredChocolate = matched.preferred_chocolate;
        }
        if (matched.dislikes) matchedParticipant.dislikes = matched.dislikes;
      }
    }

    const participant = toParticipant(row, { matchedWithName });

    res.json(
      matchedParticipant ? { participant, matchedParticipant } : { participant },
    );
  });

  router.get('/api/draw-status', (_req: Request, res: Response) => {
    const total = (countAll.get() as CountRow).total;
    const unmatched = (countUnmatched.get() as CountRow).total;

    const configRow = selectConfig.get(MIN_PARTICIPANTS_KEY) as ConfigRow | undefined;
    const minParticipants = configRow ? Number.parseInt(configRow.value, 10) : Number.NaN;
    if (!Number.isInteger(minParticipants)) {
      throw new Error(`Configuração ${MIN_PARTICIPANTS_KEY} ausente ou inválida`);
    }

    // Regra de sorteio incremental: pode sortear com pelo menos minParticipants pendentes
    const isDrawn = unmatched === 0 && total >= 2;
    const canDraw = unmatched >= 2 && unmatched >= minParticipants;

    res.json({
      isDrawn,
      totalParticipants: total,
      unmatchedParticipants: unmatched,
      minParticipants,
      canDraw,
    });
  });

  return router;
}
