# Backend - Amigo Chocolate

API REST em Express 5 com banco SQLite (better-sqlite3) e autenticação JWT para o painel admin.

## Configuração

```bash
cp .env.example .env
```

Defina `ADMIN_PASSWORD` e `JWT_SECRET` com valores fortes. Fora de `NODE_ENV=development`/`test` (inclusive com `NODE_ENV` ausente) ambos são obrigatórios, e `JWT_SECRET` precisa ter pelo menos 16 caracteres; sem isso o servidor não sobe. Veja as demais variáveis em `.env.example`.

## Scripts

Na raiz do repositório:

- `npm run server:install` - instala dependências do backend
- `npm run server:dev` - sobe o servidor com recarga automática (porta 3001)
- `npm run server:test` - roda os testes (Vitest)

Dentro de `server/`:

- `npm run dev` - servidor com `tsx watch` (`NODE_ENV=development`; usa defaults inseguros se os segredos faltarem)
- `npm start` - servidor sem watch, em produção (`NODE_ENV=production`; exige `ADMIN_PASSWORD` e `JWT_SECRET`)
- `npm run typecheck` - checagem de tipos
- `npm test` - testes

## Banco de dados

O SQLite fica em `data/app.db` (ou em `DB_PATH`) e é criado automaticamente na primeira execução. Faça backup desse arquivo e, em produção, use um volume persistente.

## Estrutura

```
src/
├── index.ts        # Entry point
├── app.ts          # App Express, CORS e error handler
├── config.ts       # Variáveis de ambiente
├── db.ts           # Conexão e schema SQLite
├── auth.ts         # Senha admin, JWT e requireAdmin
├── draw.ts         # Regra do sorteio
├── email.ts        # Envio de e-mails
├── mappers.ts      # Linhas do banco para a API
└── routes/         # public.ts, admin.ts, adminActions.ts
```

Os endpoints estão listados no README da raiz, na seção "API".
