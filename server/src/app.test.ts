import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { openDb } from './db.js';
import { createApp } from './app.js';

const db = openDb(':memory:');
const app = createApp(db);

afterAll(() => {
  db.close();
});

describe('GET /api/health', () => {
  it('responde 200 com { ok: true }', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
