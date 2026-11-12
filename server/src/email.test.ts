import { describe, expect, it } from 'vitest';
import { openDb } from './db.js';
import {
  DRAW_SUBJECT,
  escapeHtml,
  sendBatchEmails,
  testEmail,
  type EmailClient,
  type EmailPayload,
} from './email.js';

function fakeClient(failFor: string[] = []) {
  const calls: { url: string; payload: EmailPayload }[] = [];
  const client: EmailClient = {
    async post(url, payload) {
      calls.push({ url, payload });
      if (failFor.includes(payload.destinatario)) throw new Error('boom ' + payload.destinatario);
      return { data: { id: 'e-' + calls.length } };
    },
  };
  return { client, calls };
}

const opts = (client: EmailClient) => ({
  client,
  apiUrl: 'http://email.test/enviar',
  publicUrl: 'https://front.test/',
  delayMs: 0,
});

function seed() {
  const db = openDb(':memory:');
  const ins = db.prepare(
    'INSERT INTO participants (id, name, email, token, matched_with, preferred_chocolate, dislikes) VALUES (?,?,?,?,?,?,?)',
  );
  ins.run('a', 'Ana <b>', 'ana@x.com', 'tok-a', null, null, null);
  ins.run('b', 'Bia', 'bia@x.com', 'tok-b', null, null, null);
  ins.run('c', 'Cris', '', 'tok-c', null, null, null);
  db.prepare("UPDATE participants SET preferred_chocolate=?, dislikes=? WHERE id='b'").run(
    '<script>alert(1)</script>',
    `"x" & 'y'`,
  );
  db.prepare("UPDATE participants SET matched_with='b' WHERE id='a'").run();
  db.prepare("UPDATE participants SET matched_with='c' WHERE id='b'").run();
  db.prepare("UPDATE participants SET matched_with='a' WHERE id='c'").run();
  return db;
}

describe('escapeHtml', () => {
  it('escapa & < > " \'', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});

describe('sendBatchEmails', () => {
  it('escapa HTML, usa destinatario/assunto/link corretos', async () => {
    const db = seed();
    const { client, calls } = fakeClient();
    const r = await sendBatchEmails(db, opts(client));
    expect(r.success).toBe(true);
    const toAna = calls.find((c) => c.payload.destinatario === 'ana@x.com')!;
    expect(toAna.url).toBe('http://email.test/enviar');
    expect(toAna.payload.assunto).toBe(DRAW_SUBJECT);
    expect(toAna.payload).toMatchObject({ isHtml: true, cc: [], bcc: [] });
    expect(toAna.payload.body).toContain('Olá, Ana &lt;b&gt;!');
    expect(toAna.payload.body).not.toContain('<script>');
    expect(toAna.payload.body).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(toAna.payload.body).toContain('&quot;x&quot; &amp; &#39;y&#39;');
    expect(toAna.payload.body).toContain('https://front.test/participante/tok-a');
    db.close();
  });

  it('participante sem e-mail vai para errors e os demais seguem', async () => {
    const db = seed();
    const { client, calls } = fakeClient();
    const r = await sendBatchEmails(db, opts(client));
    expect(calls).toHaveLength(2);
    expect(r.results).toHaveLength(2);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ participantId: 'c', error: 'Participante sem e-mail' });
    db.close();
  });

  it('falha de um envio nao bloqueia os outros', async () => {
    const db = seed();
    const { client, calls } = fakeClient(['ana@x.com']);
    const r = await sendBatchEmails(db, opts(client));
    expect(calls).toHaveLength(2);
    expect(r.results.map((x) => x.participantId)).toEqual(['b']);
    expect(r.errors.map((x) => x.participantId)).toEqual(expect.arrayContaining(['a', 'c']));
    expect(r.errors.find((e) => e.participantId === 'a')!.error).toContain('boom');
    db.close();
  });

  it('sem matches retorna success false', async () => {
    const db = openDb(':memory:');
    const { client } = fakeClient();
    const r = await sendBatchEmails(db, opts(client));
    expect(r.success).toBe(false);
    expect(r.errors[0].message).toBe('Nenhum participante com match encontrado');
    db.close();
  });
});

describe('testEmail', () => {
  it('envia template de teste', async () => {
    const { client, calls } = fakeClient();
    const r = await testEmail('t@x.com', opts(client));
    expect(r).toMatchObject({ success: true, emailId: 'e-1' });
    expect(calls[0].payload.destinatario).toBe('t@x.com');
    expect(calls[0].payload.assunto).toBe('🧪 Teste - Amigo Chocolate');
    expect(calls[0].payload.body).toContain('href="https://front.test"');
  });
});
