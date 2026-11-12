# Amigo Chocolate - Rainha das Sete

Site interativo para realização de sorteio entre colaboradores no estilo "Amigo Secreto" temático de chocolate.

## 🚀 Tecnologias

**Frontend**
- **React 18** - Biblioteca JavaScript para interfaces
- **Vite** - Build tool e dev server
- **TypeScript** - Tipagem estática
- **React Router** - Roteamento
- **Axios** - Cliente HTTP para chamadas de API
- **React Icons** - Biblioteca de ícones

**Backend (`server/`)**
- **Node.js + Express 5** - API REST
- **SQLite** via **better-sqlite3** - Banco de dados em arquivo local
- **JWT** (jsonwebtoken) - Autenticação do painel admin
- Envio de e-mails por API HTTP externa (`EMAIL_API_URL`)
- **Vitest** + **supertest** - Testes do backend

## 📋 Funcionalidades

- ✅ Página inicial com cadastro de participantes
- ✅ Geração de link único para cada participante
- ✅ Visualização restrita do resultado (somente com link válido)
- ✅ Sorteio automático quando número mínimo é atingido
- ✅ Página administrativa com autenticação
- ✅ Visualização de todos os pares (admin)
- ✅ Configuração do número mínimo de participantes
- ✅ Exportação de lista em CSV
- ✅ Reiniciar sorteio (admin)
- ✅ Página de regras
- ✅ Design temático com cores marrom, dourado e creme
- ✅ Layout responsivo

## 🛠️ Instalação

1. Instale as dependências do frontend (raiz) e do backend:
```bash
npm install
npm run server:install
```

2. Configure o backend:
```bash
cp server/.env.example server/.env
```

Edite `server/.env` e defina, no mínimo:
- `ADMIN_PASSWORD` - senha do painel admin (use um valor forte)
- `JWT_SECRET` - segredo para assinar os tokens JWT (use um valor longo e aleatório)
- `PUBLIC_URL` - URL pública do front (usada nos links enviados por e-mail)
- `CORS_ORIGIN` - origem permitida no CORS (URL do front)
- `TRUST_PROXY` - `true` apenas quando atrás de proxy reverso
- `EMAIL_API_URL` - endpoint da API de envio de e-mails

Outras variáveis (`PORT`, `DB_PATH`, `NODE_ENV`, `EMAIL_SEND_DELAY_MS`) estão descritas em `server/.env.example`. Nunca commite o `.env` com valores reais.

3. Configure o frontend. Crie o `.env` na raiz:
```bash
cp .env.example .env
```

Em desenvolvimento, mantenha `VITE_API_URL=/api` (o proxy do Vite encaminha para o backend). Em produção, aponte para a URL pública da API, ex.: `VITE_API_URL=https://api.seudominio.com/api`.

4. Adicione o logo da Rainha das Sete:
   - Coloque o arquivo `logo.png` na pasta `public/`
   - O sistema usará um placeholder caso o arquivo não exista

## 🚀 Executando

Em desenvolvimento, use dois terminais:

**Terminal 1 - backend** (porta 3001):
```bash
npm run server:dev
```

**Terminal 2 - frontend** (porta 3000, com proxy de `/api` para o backend):
```bash
npm run dev
```

O site estará disponível em `http://localhost:3000` e a API em `http://localhost:3001/api`.

### Build e produção

Frontend:
```bash
npm run build      # tsc + vite build; gera dist/
npm run preview    # serve a build para conferência local
```

Backend:
```bash
npm --prefix server start   # roda com tsx e NODE_ENV=production
```

Fora de desenvolvimento (`npm start` = produção; também vale `NODE_ENV` ausente), `ADMIN_PASSWORD` e `JWT_SECRET` (mínimo 16 caracteres) são obrigatórios: o servidor não sobe sem eles. Só `npm run server:dev` e os testes usam defaults inseguros.

**Banco de dados:** o SQLite fica em `server/data/app.db` (ou no caminho definido em `DB_PATH`). Faça backup periódico desse arquivo e, em containers, monte-o em um volume persistente.

**Atrás de proxy reverso:** defina `TRUST_PROXY=true` para que o rate limit do login use o IP real (`X-Forwarded-For`).

## 🐳 Docker

O `docker-compose.yml` sobe dois serviços: `web` (nginx com o build do Vite, que também encaminha `/api` para a API) e `api` (Node + SQLite, sem porta exposta no host).

```bash
cp .env.example .env     # defina ADMIN_PASSWORD, JWT_SECRET (mín. 16 caracteres) e PUBLIC_URL
docker compose up -d --build
```

O site fica em `http://localhost:3000` (ou em `WEB_PORT`). O compose não sobe sem `ADMIN_PASSWORD` e `JWT_SECRET`.

- **Dados:** o SQLite fica no volume `app-data` (`/data/app.db`) e sobrevive a `docker compose down`. **Não use** `down -v`, que apaga o volume. Para backup: `docker compose cp api:/data/app.db ./backup.db`.
- **Proxy:** `TRUST_PROXY=true` já vem ativo no compose, pois o nginx fica à frente da API. Se houver outro proxy na frente (ex.: Coolify/Traefik), ajuste conforme a topologia.
- **`PUBLIC_URL`:** use a URL pública real (com `https://`), pois ela entra nos links enviados por e-mail.
- **Tempo de resposta do sorteio:** o nginx aceita até 300 s, porque o sorteio envia todos os e-mails antes de responder.

### Produção no Coolify (imagens prontas do GHCR)

Para não compilar nada no servidor de produção, o GitHub Actions (`.github/workflows/docker-publish.yml`) constrói as imagens a cada push na `main` e publica em `ghcr.io/kaaunty/amigo-chocolate-api` e `ghcr.io/kaaunty/amigo-chocolate-web` (tags `latest` e `sha-<commit>`). Em pull requests o workflow só constrói, para validar os Dockerfiles.

O Coolify usa o `docker-compose.prod.yml` (só `image:`, sem `build` e sem porta no host): o deploy apenas baixa as imagens.

- **Coolify:** em *Docker Compose Location* use `/docker-compose.prod.yml`. Variáveis obrigatórias: `ADMIN_PASSWORD`, `JWT_SECRET` e `PUBLIC_URL`. O domínio vai no serviço `web` (porta 80).
- **Pacotes no GHCR:** os pacotes `amigo-chocolate-api` e `amigo-chocolate-web` herdam a visibilidade do repositório (público), então o servidor baixa as imagens sem login. Se o repositório virar privado, use `docker login ghcr.io` no servidor com um token `read:packages`.
- **Rollback:** defina `IMAGE_TAG=sha-<commit>` no Coolify e faça o deploy para voltar a uma versão anterior.
- **Deploy manual (de propósito):** o deploy automático por push fica **desligado** no Coolify. Ligado, ele reagiria ao push antes de o workflow publicar a imagem e subiria a versão anterior. Também evita guardar no GitHub um token do Coolify, que dá acesso ao servidor de produção.
- **Fluxo:** merge na `main` → esperar o workflow *Docker* ficar verde (~1 min) → clicar em *Deploy* no Coolify (~1 min, sem build).

## 🧪 Testes

```bash
npm run server:test
```

## 📁 Estrutura do Projeto

```
src/                      # Frontend (React + Vite)
├── components/           # Componentes reutilizáveis
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── ParticipantForm.tsx
│   ├── AdminLogin.tsx
│   └── LoadingSpinner.tsx
├── pages/                # Páginas da aplicação
│   ├── Home.tsx
│   ├── Participant.tsx
│   ├── Rules.tsx
│   └── Admin.tsx
├── services/
│   └── api.ts            # Configuração Axios e funções de API
├── types/                # Tipagens TypeScript
├── styles/               # Estilos globais
├── App.tsx               # Componente principal com rotas
└── main.tsx              # Entry point

Dockerfile, nginx.conf, docker-compose.yml   # Front (nginx) e orquestração

server/                   # Backend (Express + SQLite; server/Dockerfile)
├── src/
│   ├── index.ts          # Entry point: abre o banco e sobe o servidor
│   ├── app.ts            # Criação do app Express, CORS e tratamento de erros
│   ├── config.ts         # Leitura e validação das variáveis de ambiente
│   ├── db.ts             # Conexão SQLite e schema
│   ├── auth.ts           # Senha admin, JWT e middleware requireAdmin
│   ├── draw.ts           # Regra do sorteio
│   ├── email.ts          # Envio de e-mails (lote e teste)
│   ├── mappers.ts        # Conversão de linhas do banco para a API
│   └── routes/           # public.ts, admin.ts, adminActions.ts
├── data/                 # Banco SQLite (app.db), criado automaticamente
├── .env.example
└── README.md
```

## 🔌 API

Base: `/api` (em dev, o Vite faz o proxy para `http://localhost:3001`).

### Público
- `GET /api/health` - Health check
- `POST /api/participants` - Cadastrar participante (retorna o participante e o link único)
- `GET /api/participants/:token` - Buscar participante por token (inclui o par, quando o sorteio já ocorreu)
- `GET /api/draw-status` - Status do sorteio

### Admin
Todas as rotas abaixo, exceto o login, exigem header `Authorization: Bearer <token>`.

- `POST /api/admin/login` - Autenticação admin (retorna JWT, válido por 8h)
- `GET /api/admin/participants` - Listar todos os participantes e pares
- `GET /api/admin/export` - Exportar CSV
- `PUT /api/admin/config` - Atualizar número mínimo de participantes
- `POST /api/admin/reset` - Reiniciar sorteio (mantém participantes, limpa pares)
- `POST /api/admin/draw` - Realizar sorteio e disparar e-mails
- `POST /api/admin/send-emails` - Reenviar e-mails em lote
- `POST /api/admin/test-email` - Enviar e-mail de teste

## 🎨 Design

O design utiliza uma paleta temática:
- **Marrom**: `#8B4513`, `#A0522D`, `#CD853F`, `#DEB887`
- **Dourado**: `#D4AF37`, `#FFD700`
- **Creme**: `#FFF8DC`, `#F5F5DC`

## 📝 Notas

- O token do admin (JWT) é armazenado no localStorage do navegador
- O logo deve ser adicionado em `public/logo.png`

## 📄 Licença

Este projeto é privado e de uso interno.
