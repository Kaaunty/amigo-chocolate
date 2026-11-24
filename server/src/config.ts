import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Carrega server/.env (relativo a este arquivo, nao ao cwd)
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

// Valor de env ou undefined se ausente/vazio/so espacos.
function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? undefined : value;
}

// Defaults inseguros so valem com NODE_ENV exatamente 'development' ou 'test'.
// Qualquer outro valor (inclusive ausente) exige os segredos (falha fechada).
const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
const MIN_JWT_SECRET_LENGTH = 16;

let adminPassword = readEnv('ADMIN_PASSWORD');
let jwtSecret = readEnv('JWT_SECRET');

if (isDevOrTest) {
  // Defaults inseguros de proposito, apenas para desenvolvimento local e testes.
  adminPassword ??= 'dev-admin-inseguro';
  jwtSecret ??= 'dev-jwt-secret-inseguro';
} else {
  const faltando: string[] = [];
  if (!adminPassword) faltando.push('ADMIN_PASSWORD');
  if (!jwtSecret) faltando.push('JWT_SECRET');
  if (faltando.length > 0) {
    throw new Error(
      `Variaveis obrigatorias ausentes (NODE_ENV diferente de development/test): ${faltando.join(', ')}`,
    );
  }
  if ((jwtSecret as string).length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET deve ter pelo menos ${MIN_JWT_SECRET_LENGTH} caracteres`);
  }
}

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(`PORT invalida: ${process.env.PORT}`);
}

export const config = {
  NODE_ENV: process.env.NODE_ENV ?? 'production',
  PORT: port,
  DB_PATH:
    process.env.DB_PATH && process.env.DB_PATH.trim() !== ''
      ? process.env.DB_PATH
      : fileURLToPath(new URL('../data/app.db', import.meta.url)),
  ADMIN_PASSWORD: adminPassword as string,
  JWT_SECRET: jwtSecret as string,
  PUBLIC_URL: process.env.PUBLIC_URL ?? 'http://localhost:3000',
  EMAIL_API_URL:
    process.env.EMAIL_API_URL ??
    'https://api-erp.rainhadassete.com.br/Email/enviar',
  EMAIL_SEND_DELAY_MS: Math.max(0, Number(process.env.EMAIL_SEND_DELAY_MS) || 0),
  TRUST_PROXY: ['1', 'true'].includes((process.env.TRUST_PROXY ?? '').trim().toLowerCase()),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
} as const;
