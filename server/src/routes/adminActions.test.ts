import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type Database from 'better-sqlite3';
import { openDb } from '../db.js';
import { createApp } from '../app.js';
import { config } from '../config.js';
import type { EmailClient, EmailPayload } from '../email.js';

let db: Database.Database;
let app: ReturnType<typeof createApp>;
let calls: EmailPayload[];
let failAll = false;

beforeEach(() => {
  db = openDb(':memory:');
  calls = [];
  failAll = false;
  const client: EmailClient = {
    async post(_url, payload) {
      calls.push(payload);
      if (failAll) throw new Error('rede fora');
      return { data: { id: 'x1' } };
    },
  };
  app = createApp(db, { email: { client, delayMs: 0, publicUrl: 'https://front.test' } });
});
afterEach(() => db.close());

async function token() {
  return (await request(app).post('/api/admin/login').send({ password: config.ADMIN_PASSWORD })).body
    .token as string;
}

function seed(n: number) {
  for (let i = 0; i < n; i++) {
    db.prepare('INSERT INTO participants (id, name, email, token) VALUES (?,?,?,?)').run(
      `p${i}`, `P${i}`, `p${i}@x.com`, `t${i}`,
    );
  }
}

describe('autenticacao', () => {
  it.each(['/api/admin/draw', '/api/admin/send-emails', '/api/admin/test-email'])(
    '401 sem token em %s',
    async (path) => {
      expect((await request(app).post(path).send({})).status).toBe(401);
    },
  );
});

describe('POST /api/admin/draw', () => {
  it('400 quando nao ha participantes suficientes', async () => {
    seed(1);
    const res = await request(app).post('/api/admin/draw').set('Authorization', `Bearer ${await token()}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('pelo menos 2');
    expect(calls).toHaveLength(0);
  });

  it('sorteia e envia e-mails', async () => {
    seed(5);
    const res = await request(app).post('/api/admin/draw').set('Authorization', `Bearer ${await token()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Sorteio realizado com sucesso',
      emailResult: { sent: 5, failed: 0 },
    });
    expect(calls).toHaveLength(5);
  });

  it('falha de e-mail nao falha o sorteio', async () => {
    seed(5);
    failAll = true;
    const res = await request(app).post('/api/admin/draw').set('Authorization', `Bearer ${await token()}`);
    expect(res.status).toBe(200);
    expect(res.body.emailResult).toEqual({ sent: 0, failed: 5 });
    const n = db.prepare('SELECT COUNT(*) c FROM participants WHERE matched_with IS NOT NULL').get() as { c: number };
    expect(n.c).toBe(5);
  });
});

describe('POST /api/admin/send-emails', () => {
  it('retorna o formato do lote', async () => {
    seed(5);
    await request(app).post('/api/admin/draw').set('Authorization', `Bearer ${await token()}`);
    calls.length = 0;
    const res = await request(app).post('/api/admin/send-emails').set('Authorization', `Bearer ${await token()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toHaveLength(5);
    expect(res.body.errors).toEqual([]);
    expect(res.body.message).toBe('Emails enviados: 5 sucesso, 0 erros');
  });
});

describe('POST /api/admin/test-email', () => {
  it('400 com e-mail invalido', async () => {
    const t = await token();
    for (const email of [undefined, '', 'abc', 'a@b', 42]) {
      const res = await request(app).post('/api/admin/test-email').set('Authorization', `Bearer ${t}`).send({ email });
      expect(res.status).toBe(400);
    }
    expect(calls).toHaveLength(0);
  });

  it('envia e responde emailId', async () => {
    const res = await request(app)
      .post('/api/admin/test-email')
      .set('Authorization', `Bearer ${await token()}`)
      .send({ email: 'ok@x.com' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, emailId: 'x1' });
    expect(calls[0].destinatario).toBe('ok@x.com');
  });

  it('502 quando o provedor falha, sem vazar detalhes', async () => {
    failAll = true;
    const res = await request(app)
      .post('/api/admin/test-email')
      .set('Authorization', `Bearer ${await token()}`)
      .send({ email: 'ok@x.com' });
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('rede fora');
  });
});
