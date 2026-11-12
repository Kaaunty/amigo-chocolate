import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
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

async function login(...args: [] | [unknown]) {
  const password = args.length === 0 ? config.ADMIN_PASSWORD : args[0];
  return request(app).post('/api/admin/login').send({ password });
}

async function token(): Promise<string> {
  return (await login()).body.token as string;
}

function insert(id: string, name: string, createdAt: string, email = '') {
  db.prepare(
    'INSERT INTO participants (id, name, email, token, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, name, email, `tok-${id}`, createdAt);
}

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

const protectedRoutes: Array<['get' | 'put' | 'post', string]> = [
  ['get', '/api/admin/participants'],
  ['get', '/api/admin/export'],
  ['put', '/api/admin/config'],
  ['post', '/api/admin/reset'],
];

describe('POST /api/admin/login', () => {
  it('retorna token com senha correta', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const payload = jwt.verify(res.body.token, config.JWT_SECRET, {
      algorithms: ['HS256'],
    }) as jwt.JwtPayload;
    expect(payload.admin).toBe(true);
    expect(payload.exp! - payload.iat!).toBe(8 * 3600);
  });

  it('401 com senha errada, ausente ou nao string', async () => {
    for (const password of ['errada', undefined, 123, null, ['x'], { a: 1 }]) {
      const res = await login(password);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ success: false });
    }
    const semCorpo = await request(app).post('/api/admin/login');
    expect(semCorpo.status).toBe(401);
    expect(semCorpo.body).toEqual({ success: false });
  });

  it('429 apos 10 falhas e sucesso zera o contador', async () => {
    for (let i = 0; i < 9; i++) await login('errada');
    expect((await login()).status).toBe(200); // zera
    for (let i = 0; i < 10; i++) {
      expect((await login('errada')).status).toBe(401);
    }
    const bloqueado = await login('errada');
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body).toEqual({
      message: 'Muitas tentativas. Tente novamente mais tarde.',
    });
    // mesmo a senha certa fica bloqueada
    expect((await login()).status).toBe(429);
  });
});

describe('autorizacao nas rotas protegidas', () => {
  const invalidAuths: Array<[string, () => string | undefined]> = [
    ['ausente', () => undefined],
    ['sem Bearer', () => 'abc'],
    ['token lixo', () => 'Bearer lixo'],
    [
      'expirado',
      () =>
        'Bearer ' +
        jwt.sign({ admin: true }, config.JWT_SECRET, { algorithm: 'HS256', expiresIn: -10 }),
    ],
    [
      'outro segredo',
      () => 'Bearer ' + jwt.sign({ admin: true }, 'outro-segredo', { expiresIn: '1h' }),
    ],
    [
      'sem admin',
      () => 'Bearer ' + jwt.sign({ foo: 1 }, config.JWT_SECRET, { expiresIn: '1h' }),
    ],
    [
      'alg none',
      () => 'Bearer ' + b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({ admin: true }) + '.',
    ],
  ];

  for (const [method, path] of protectedRoutes) {
    for (const [label, build] of invalidAuths) {
      it(`${method.toUpperCase()} ${path} -> 401 com token ${label}`, async () => {
        const req = request(app)[method](path);
        const auth = build();
        if (auth) req.set('Authorization', auth);
        const res = await req.send({ minParticipants: 3 });
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ message: 'Não autorizado' });
      });
    }
  }
});

describe('GET /api/admin/participants', () => {
  it('lista ordenada com pares', async () => {
    insert('b', 'Bia', '2024-01-02T10:00:00.000Z');
    insert('a', 'Ana', '2024-01-01T10:00:00.000Z', 'ana@x.com');
    db.prepare('UPDATE participants SET matched_with = ? WHERE id = ?').run('b', 'a');

    const res = await request(app)
      .get('/api/admin/participants')
      .set('Authorization', `Bearer ${await token()}`);
    expect(res.status).toBe(200);
    expect(res.body.map((p: { name: string }) => p.name)).toEqual(['Ana', 'Bia']);
    expect(res.body[0]).toMatchObject({
      id: 'a',
      email: 'ana@x.com',
      matchedWith: 'b',
      matchedWithName: 'Bia',
    });
    expect(res.body[1].matchedWith).toBeUndefined();
    expect(res.body[1].matchedWithName).toBeUndefined();
  });
});

describe('GET /api/admin/export', () => {
  it('gera CSV com BOM, cabecalho, escaping e protecao de formula', async () => {
    insert('a', '=HYPERLINK("x")', '2024-03-05T15:00:00.000Z', 'a@x.com');
    insert('b', 'Maria "Mari"', '2024-03-06T15:00:00.000Z', '+55@x.com');
    db.prepare('UPDATE participants SET matched_with = ? WHERE id = ?').run('b', 'a');

    const res = await request(app)
      .get('/api/admin/export')
      .set('Authorization', `Bearer ${await token()}`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toBe('attachment; filename="participantes.csv"');

    const raw = res.body as Buffer;
    expect([...raw.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = raw.toString('utf8').slice(1).split('\n');
    expect(lines[0]).toBe('Nome,Email,Token,Data Cadastro,Amigo Chocolate');
    expect(lines[1]).toBe(
      `"'=HYPERLINK(""x"")","a@x.com","tok-a","05/03/2024","Maria ""Mari"""`,
    );
    expect(lines[2]).toBe(`"Maria ""Mari""","'+55@x.com","tok-b","06/03/2024",""`);
  });
});

describe('PUT /api/admin/config', () => {
  async function put(body?: unknown) {
    const req = request(app)
      .put('/api/admin/config')
      .set('Authorization', `Bearer ${await token()}`);
    return body === undefined ? req : req.send(body as object);
  }

  it('atualiza minParticipants e reflete em draw-status', async () => {
    const res = await put({ minParticipants: 7 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    const status = await request(app).get('/api/draw-status');
    expect(status.body.minParticipants).toBe(7);
  });

  it('400 para valores invalidos', async () => {
    for (const body of [
      { minParticipants: 1 },
      { minParticipants: 'abc' },
      { minParticipants: '5' },
      { minParticipants: 2.5 },
      { minParticipants: null },
      {},
      undefined,
    ]) {
      const res = await put(body);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'Número mínimo deve ser pelo menos 2' });
    }
    const status = await request(app).get('/api/draw-status');
    expect(status.body.minParticipants).toBe(5);
  });
});

describe('POST /api/admin/reset', () => {
  it('limpa pares e mantem participantes', async () => {
    insert('a', 'Ana', '2024-01-01T10:00:00.000Z');
    insert('b', 'Bia', '2024-01-02T10:00:00.000Z');
    db.prepare('UPDATE participants SET matched_with = ? WHERE id = ?').run('b', 'a');
    db.prepare('UPDATE participants SET matched_with = ? WHERE id = ?').run('a', 'b');

    const res = await request(app)
      .post('/api/admin/reset')
      .set('Authorization', `Bearer ${await token()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const rows = db.prepare('SELECT matched_with FROM participants').all() as {
      matched_with: string | null;
    }[];
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.matched_with === null)).toBe(true);
  });
});
