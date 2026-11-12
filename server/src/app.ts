import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import type Database from 'better-sqlite3';
import { config } from './config.js';
import { createPublicRouter } from './routes/public.js';
import { createAdminRouter } from './routes/admin.js';
import { createAdminActionsRouter, type AdminActionsDeps } from './routes/adminActions.js';

export function createApp(db: Database.Database, deps: AdminActionsDeps = {}) {
  const app = express();

  if (config.TRUST_PROXY) app.set('trust proxy', 1);

  app.locals.db = db;

  app.use(express.json());
  app.use(cors({ origin: config.CORS_ORIGIN }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.use(createPublicRouter(db));
  app.use('/api/admin', createAdminRouter(db));
  // Sorteio e e-mails; requireAdmin e aplicado dentro do router.
  app.use('/api/admin', createAdminActionsRouter(db, deps));

  // Tratamento de erro final: sempre responde JSON { message }
  app.use(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express exige 4 argumentos
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const status =
        typeof err === 'object' &&
        err !== null &&
        'status' in err &&
        typeof (err as { status: unknown }).status === 'number'
          ? (err as { status: number }).status
          : 500;

      if (status >= 500) {
        console.error(err);
        res.status(status).json({ message: 'Erro interno do servidor' });
        return;
      }

      const message =
        err instanceof Error ? err.message : 'Requisicao invalida';
      res.status(status).json({ message });
    },
  );

  return app;
}
