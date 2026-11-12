import { randomInt } from 'node:crypto';
import type Database from 'better-sqlite3';

export interface DrawPair {
  participantId: string;
  participantName: string;
  matchedId: string;
  matchedName: string;
}

export type DrawResult =
  | { success: false; message: string }
  | { success: true; message: string; pairs: DrawPair[] };

interface UnmatchedRow {
  id: string;
  name: string;
}

// Fisher-Yates com CSPRNG (crypto.randomInt), em memoria.
export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Sorteio incremental: so entram participantes sem match. Forma um ciclo unico
// (cada um tira o proximo; o ultimo tira o primeiro), logo ninguem tira a si
// mesmo e cada um e tirado exatamente uma vez. Tudo numa transacao IMMEDIATE.
export function performDraw(db: Database.Database): DrawResult {
  const tx = db.transaction((): DrawResult => {
    const unmatched = db
      .prepare('SELECT id, name FROM participants WHERE matched_with IS NULL')
      .all() as UnmatchedRow[];

    if (unmatched.length < 2) {
      return {
        success: false,
        message: 'É necessário pelo menos 2 participantes sem match para realizar o sorteio',
      };
    }

    const minRow = db
      .prepare("SELECT value FROM config WHERE key = 'min_participants'")
      .get() as { value: string } | undefined;
    const min = Number.parseInt(minRow?.value ?? '', 10);
    if (Number.isFinite(min) && unmatched.length < min) {
      return {
        success: false,
        message: 'Número mínimo de participantes sem match não atingido',
      };
    }

    const order = shuffle(unmatched);
    const update = db.prepare(
      'UPDATE participants SET matched_with = ? WHERE id = ? AND matched_with IS NULL',
    );
    const pairs: DrawPair[] = [];

    order.forEach((participant, i) => {
      const next = order[(i + 1) % order.length];
      const info = update.run(next.id, participant.id);
      if (info.changes !== 1) {
        throw new Error('Falha ao gravar o sorteio');
      }
      pairs.push({
        participantId: participant.id,
        participantName: participant.name,
        matchedId: next.id,
        matchedName: next.name,
      });
    });

    return { success: true, message: 'Sorteio realizado com sucesso', pairs };
  });

  return tx.immediate();
}
