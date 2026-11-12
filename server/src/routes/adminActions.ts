import { Router, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import { requireAdmin } from '../auth.js';
import { performDraw } from '../draw.js';
import {
  errorMessage,
  sendBatchEmails,
  testEmail,
  type EmailOptions,
} from '../email.js';

export interface AdminActionsDeps {
  email?: EmailOptions;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createAdminActionsRouter(
  db: Database.Database,
  deps: AdminActionsDeps = {},
): Router {
  const router = Router();
  const emailOpts = deps.email ?? {};

  router.use(requireAdmin);

  // Express 5 repassa rejeicoes de handlers async ao tratador de erro.
  router.post('/draw', async (_req: Request, res: Response) => {
    const result = performDraw(db);
    if (!result.success) {
      res.status(400).json({ message: result.message });
      return;
    }

    // Como no front: dispara o lote para todos com match; falha de e-mail nao falha o sorteio.
    let sent = 0;
    let failed = 0;
    try {
      const batch = await sendBatchEmails(db, emailOpts);
      sent = batch.results.length;
      failed = batch.errors.length;
    } catch (error) {
      console.error('Erro ao enviar emails apos o sorteio:', errorMessage(error));
    }

    res.json({
      success: true,
      message: result.message,
      emailResult: { sent, failed },
    });
  });

  router.post('/send-emails', async (_req: Request, res: Response) => {
    res.json(await sendBatchEmails(db, emailOpts));
  });

  router.post('/test-email', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { email?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
      res.status(400).json({ message: 'E-mail inválido' });
      return;
    }
    try {
      res.json(await testEmail(email, emailOpts));
    } catch (error) {
      console.error('Erro ao enviar email de teste:', errorMessage(error));
      res.status(502).json({ message: 'Falha ao enviar o e-mail de teste' });
    }
  });

  return router;
}
