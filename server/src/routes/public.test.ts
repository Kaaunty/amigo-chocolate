import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type Database from 'better-sqlite3';
import { openDb } from '../db.js';
import { createApp } from '../app.js';
import { config } from '../config.js';

let db: Database.Database;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  db = openDb(':memory:');
  app = createApp(db);
});

afterEach(() => {
  db.close();
});

async function cadastrar(body: Record<string, unknown>) {
  return request(app).post('/api/participants').send(body);
}

describe('POST /api/participants', () => {
  it('cadastra com 201 e retorna participant e link', async () => {
    const res = await cadastrar({
      name: '  Ana Silva  ',
      email: '  ANA@Exemplo.COM ',
      preferredChocolate: ' Ao leite ',
      dislikes: ' Amendoim ',
    });

    expect(res.status).toBe(201);
    expect(res.body.participant).toEqual({
      id: expect.any(String),
      name: 'Ana Silva',
      email: 'ana@exemplo.com',
      token: expect.stringMatching(/^[0-9a-f]{32}$/),
      createdAt: expect.any(String),
      preferredChocolate: 'Ao leite',
      dislikes: 'Amendoim',
    });
    expect(res.body.participant.matchedWith).toBeUndefined();
    expect(res.body.link).toBe(
      `${config.PUBLIC_URL}/participante/${res.body.participant.token}`,
    );
  });

  it('aceita cadastro sem email e campos opcionais, guardando email vazio e campos nulos', async () => {
    const res = await cadastrar({ name: 'Bruno', email: '   ', dislikes: '  ' });

    expect(res.status).toBe(201);
    expect(res.body.participant.email).toBe('');
    expect(res.body.participant.preferredChocolate).toBeUndefined();
    expect(res.body.participant.dislikes).toBeUndefined();
  });

  it('responde 409 ao cadastrar nome duplicado', async () => {
    await cadastrar({ name: 'Carla', email: 'carla@exemplo.com' });
    const res = await cadastrar({ name: 'Carla', email: 'outra@exemplo.com' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: 'Este nome já está cadastrado' });
  });

  it('responde 400 quando o nome está vazio', async () => {
    const res = await cadastrar({ name: '   ', email: 'x@exemplo.com' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Nome é obrigatório' });
  });

  it('responde 400 quando o nome está ausente', async () => {
    const res = await cadastrar({ email: 'x@exemplo.com' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Nome é obrigatório' });
  });

  it('responde 400 quando um texto excede o limite', async () => {
    const res = await cadastrar({ name: 'Diego', dislikes: 'x'.repeat(1001) });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no máximo 1000 caracteres/);
  });
});

describe('GET /api/participants/:token', () => {
  it('responde 404 para token inexistente', async () => {
    const res = await request(app).get('/api/participants/naoexiste');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Participante não encontrado' });
  });

  it('retorna participante sem match', async () => {
    const cadastro = await cadastrar({ name: 'Eva', email: 'eva@exemplo.com' });
    const token: string = cadastro.body.participant.token;

    const res = await request(app).get(`/api/participants/${token}`);

    expect(res.status).toBe(200);
    expect(res.body.participant).toEqual(cadastro.body.participant);
    expect(res.body.matchedParticipant).toBeUndefined();
  });

  it('retorna participante com match e dados do par', async () => {
    const a = await cadastrar({
      name: 'Fabio',
      email: 'fabio@exemplo.com',
      preferredChocolate: 'Branco',
    });
    const b = await cadastrar({
      name: 'Gisele',
      email: 'gisele@exemplo.com',
      dislikes: 'Cereja',
    });
    const idA: string = a.body.participant.id;
    const idB: string = b.body.participant.id;

    // Fabio tirou Gisele
    db.prepare('UPDATE participants SET matched_with = ? WHERE id = ?').run(idB, idA);

    const res = await request(app).get(`/api/participants/${a.body.participant.token}`);

    expect(res.status).toBe(200);
    expect(res.body.participant).toEqual({
      id: idA,
      name: 'Fabio',
      email: 'fabio@exemplo.com',
      token: a.body.participant.token,
      createdAt: a.body.participant.createdAt,
      matchedWith: idB,
      matchedWithName: 'Gisele',
      preferredChocolate: 'Branco',
    });
    expect(res.body.matchedParticipant).toEqual({
      id: idB,
      name: 'Gisele',
      dislikes: 'Cereja',
    });
    const raw = JSON.stringify(res.body.matchedParticipant);
    expect(raw).not.toContain(b.body.participant.token);
    expect(raw).not.toContain('gisele@exemplo.com');
    expect(res.body.matchedParticipant).not.toHaveProperty('token');
    expect(res.body.matchedParticipant).not.toHaveProperty('email');
    expect(res.body.matchedParticipant).not.toHaveProperty('matchedWith');
  });
});

describe('GET /api/draw-status', () => {
  it('sem participantes: nao sorteado e nao pode sortear', async () => {
    const res = await request(app).get('/api/draw-status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      isDrawn: false,
      totalParticipants: 0,
      unmatchedParticipants: 0,
      minParticipants: 5,
      canDraw: false,
    });
  });

  it('2 participantes sem match com minimo 2: pode sortear', async () => {
    db.prepare("UPDATE config SET value = '2' WHERE key = 'min_participants'").run();
    await cadastrar({ name: 'Hugo' });
    await cadastrar({ name: 'Irene' });

    const res = await request(app).get('/api/draw-status');

    expect(res.body).toEqual({
      isDrawn: false,
      totalParticipants: 2,
      unmatchedParticipants: 2,
      minParticipants: 2,
      canDraw: true,
    });
  });

  it('todos com match: sorteado e nao pode sortear de novo', async () => {
    db.prepare("UPDATE config SET value = '2' WHERE key = 'min_participants'").run();
    const h = await cadastrar({ name: 'Joana' });
    const i = await cadastrar({ name: 'Kleber' });
    const idH: string = h.body.participant.id;
    const idI: string = i.body.participant.id;
    db.prepare('UPDATE participants SET matched_with = ? WHERE id = ?').run(idI, idH);
    db.prepare('UPDATE participants SET matched_with = ? WHERE id = ?').run(idH, idI);

    const res = await request(app).get('/api/draw-status');

    expect(res.body).toEqual({
      isDrawn: true,
      totalParticipants: 2,
      unmatchedParticipants: 0,
      minParticipants: 2,
      canDraw: false,
    });
  });
});
