import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// config.ts avalia as variaveis no import; cada teste reimporta o modulo.
async function carregar() {
  vi.resetModules();
  return (await import('./config.js')).config;
}

describe('config: segredos', () => {
  beforeEach(() => {
    // Evita que o .env local interfira (dotenv nao sobrescreve variaveis ja definidas)
    vi.stubEnv('ADMIN_PASSWORD', '');
    vi.stubEnv('JWT_SECRET', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('NODE_ENV ausente sem variaveis: lanca listando as faltantes', async () => {
    vi.stubEnv('NODE_ENV', undefined as unknown as string);
    await expect(carregar()).rejects.toThrow(/ADMIN_PASSWORD, JWT_SECRET/);
  });

  it('valores vazios ou so espacos contam como ausentes', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_PASSWORD', '   ');
    vi.stubEnv('JWT_SECRET', '');
    await expect(carregar()).rejects.toThrow(/ADMIN_PASSWORD, JWT_SECRET/);
  });

  it('JWT_SECRET curto em modo nao-dev: lanca', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_PASSWORD', 'senha-forte');
    vi.stubEnv('JWT_SECRET', 'curto');
    await expect(carregar()).rejects.toThrow(/JWT_SECRET deve ter pelo menos 16/);
  });

  it('NODE_ENV desconhecido (ex.: staging) tambem exige segredos', async () => {
    vi.stubEnv('NODE_ENV', 'staging');
    await expect(carregar()).rejects.toThrow(/ADMIN_PASSWORD, JWT_SECRET/);
  });

  it.each(['test', 'development'])('NODE_ENV=%s usa defaults de dev', async (env) => {
    vi.stubEnv('NODE_ENV', env);
    const config = await carregar();
    expect(config.ADMIN_PASSWORD).toBe('dev-admin-inseguro');
    expect(config.JWT_SECRET).toBe('dev-jwt-secret-inseguro');
  });

  it('producao com variaveis validas: ok', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_PASSWORD', 'senha-forte');
    vi.stubEnv('JWT_SECRET', 'segredo-com-mais-de-16-chars');
    const config = await carregar();
    expect(config.ADMIN_PASSWORD).toBe('senha-forte');
    expect(config.JWT_SECRET).toBe('segredo-com-mais-de-16-chars');
  });
});
