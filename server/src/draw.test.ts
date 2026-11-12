import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { openDb } from './db.js';
import { performDraw } from './draw.js';

let db: Database.Database;
beforeEach(() => {
  db = openDb(':memory:');
  db.prepare("UPDATE config SET value = '2' WHERE key = 'min_participants'").run();
});
afterEach(() => db.close());

function add(n: number, prefix = 'p') {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const id = `${prefix}${i}`;
    db.prepare('INSERT INTO participants (id, name, token) VALUES (?, ?, ?)').run(id, `Nome ${id}`, `t-${id}`);
    ids.push(id);
  }
  return ids;
}
const matches = () =>
  new Map(
    (db.prepare('SELECT id, matched_with FROM participants').all() as { id: string; matched_with: string | null }[]).map(
      (r) => [r.id, r.matched_with],
    ),
  );

function isSingleCycle(ids: string[], m: Map<string, string | null>) {
  let cur = ids[0];
  const seen = new Set<string>();
  while (!seen.has(cur)) {
    seen.add(cur);
    cur = m.get(cur)!;
  }
  return seen.size === ids.length && cur === ids[0];
}

describe('performDraw', () => {
  it.each([2, 3, 5, 10])('N=%i: sem auto-match, bijecao e ciclo unico (100 execucoes)', (n) => {
    const ids = add(n);
    for (let run = 0; run < 100; run++) {
      db.prepare('UPDATE participants SET matched_with = NULL').run();
      const r = performDraw(db);
      expect(r.success).toBe(true);
      const m = matches();
      const targets = [...m.values()];
      for (const [id, to] of m) expect(to).not.toBe(id);
      expect(new Set(targets).size).toBe(n);
      expect(targets.every((t) => t && ids.includes(t))).toBe(true);
      expect(isSingleCycle(ids, m)).toBe(true);
      if (r.success) {
        expect(r.pairs).toHaveLength(n);
        for (const p of r.pairs) {
          expect(m.get(p.participantId)).toBe(p.matchedId);
          expect(p.participantName).toBe(`Nome ${p.participantId}`);
          expect(p.matchedName).toBe(`Nome ${p.matchedId}`);
        }
      }
    }
  });

  it('falha com menos de 2 sem match', () => {
    add(1);
    expect(performDraw(db)).toEqual({
      success: false,
      message: 'É necessário pelo menos 2 participantes sem match para realizar o sorteio',
    });
  });

  it('falha abaixo do minimo configurado', () => {
    db.prepare("UPDATE config SET value = '5' WHERE key = 'min_participants'").run();
    add(4);
    expect(performDraw(db)).toEqual({
      success: false,
      message: 'Número mínimo de participantes sem match não atingido',
    });
    expect([...matches().values()].every((v) => v === null)).toBe(true);
  });

  it('incremental: antigos intactos, novos formam ciclo entre si', () => {
    add(3, 'old');
    db.prepare('UPDATE participants SET matched_with = ? WHERE id = ?').run('old1', 'old0');
    db.prepare('UPDATE participants SET matched_with = ? WHERE id = ?').run('old2', 'old1');
    db.prepare('UPDATE participants SET matched_with = ? WHERE id = ?').run('old0', 'old2');
    const fresh = add(4, 'new');
    for (let run = 0; run < 50; run++) {
      db.prepare("UPDATE participants SET matched_with = NULL WHERE id LIKE 'new%'").run();
      expect(performDraw(db).success).toBe(true);
      const m = matches();
      expect(m.get('old0')).toBe('old1');
      expect(m.get('old1')).toBe('old2');
      expect(m.get('old2')).toBe('old0');
      for (const id of fresh) expect(fresh).toContain(m.get(id));
      expect(new Set(fresh.map((id) => m.get(id))).size).toBe(4);
      expect(isSingleCycle(fresh, m)).toBe(true);
    }
  });

  it('e atomico: erro no meio faz rollback', () => {
    add(5);
    db.exec(`CREATE TRIGGER boom BEFORE UPDATE ON participants
             WHEN NEW.id = 'p2' BEGIN SELECT RAISE(ABORT, 'falha forcada'); END;`);
    expect(() => performDraw(db)).toThrow('falha forcada');
    expect([...matches().values()].every((v) => v === null)).toBe(true);
  });
});
