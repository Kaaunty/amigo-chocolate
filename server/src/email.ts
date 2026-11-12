import axios from 'axios';
import type Database from 'better-sqlite3';
import { config } from './config.js';

export interface EmailPayload {
  destinatario: string;
  assunto: string;
  body: string;
  isHtml: true;
  cc: string[];
  bcc: string[];
}

// Cliente HTTP injetavel (testes sem rede).
export interface EmailClient {
  post(
    url: string,
    payload: EmailPayload,
    options?: { headers?: Record<string, string>; timeout?: number },
  ): Promise<{ data?: unknown }>;
}

export interface EmailOptions {
  client?: EmailClient;
  apiUrl?: string;
  publicUrl?: string;
  delayMs?: number;
}

export interface BatchResultItem {
  participantId: string;
  participantName: string;
  email: string;
  success: true;
  emailId: string;
}

export interface BatchErrorItem {
  participantId?: string;
  participantName?: string;
  email?: string;
  error?: string;
  message?: string;
}

export interface BatchResult {
  success: boolean;
  results: BatchResultItem[];
  errors: BatchErrorItem[];
  message: string;
}

export const DRAW_SUBJECT = '🎁 Amigo Chocolate - Seu sorteio está pronto!';
export const TEST_SUBJECT = '🧪 Teste - Amigo Chocolate';

const defaultClient: EmailClient = {
  post: (url, payload, options) => axios.post(url, payload, options),
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseUrl(publicUrl: string): string {
  return publicUrl.replace(/\/+$/, '');
}

const LOGO =
  'https://imagens.rainhadassete.com.br/assinatura_rainhadassete/assinatura_arquivos/novas/logo.png';

function layout(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #dddddd;">
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #e8e8e8; padding: 30px 20px;">
              <img src="${LOGO}" alt="Rainha das Sete" width="200" style="display: block; margin: 0 auto 15px;">
              <h1 style="color: #333333; margin: 0; font-size: 28px; font-weight: bold;">🎁 Amigo Chocolate</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px 20px;">
${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

const WARNING_BOX = `
              <!-- Warning Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFE4E1; border-left: 4px solid #DC143C; margin: 20px 0;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #8B4513; font-size: 14px;">
                      🔒 <strong>Lembre-se:</strong> Mantenha o segredo! Não conte para ninguém quem você tirou.
                    </p>
                  </td>
                </tr>
              </table>`;

function button(href: string, label: string): string {
  return `
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(href)}" style="display: inline-block; background-color: #DC143C; color: #ffffff; padding: 12px 30px; text-decoration: none; font-weight: bold; font-size: 16px;">${label}</a>
                  </td>
                </tr>
              </table>`;
}

export interface DrawEmailData {
  name: string;
  token: string;
  matchedName: string;
  matchedPreferredChocolate?: string | null;
  matchedDislikes?: string | null;
}

export function buildDrawEmailHtml(data: DrawEmailData, publicUrl: string): string {
  const { matchedPreferredChocolate: choc, matchedDislikes: dislikes } = data;
  const link = `${baseUrl(publicUrl)}/participante/${encodeURIComponent(data.token)}`;

  const preferences =
    choc || dislikes
      ? `
              <!-- Preferences Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF8DC; border: 1px solid #FFD700; margin: 20px 0; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">${
                    choc
                      ? `
                    <div style="margin-bottom: 15px;">
                      <p style="margin: 0 0 5px 0; color: #8B4513; font-size: 14px; font-weight: bold;">
                        🍫 Chocolate Preferido:
                      </p>
                      <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
                        ${escapeHtml(choc)}
                      </p>
                    </div>`
                      : ''
                  }${
                    dislikes
                      ? `
                    <div>
                      <p style="margin: 0 0 5px 0; color: #8B4513; font-size: 14px; font-weight: bold;">
                        🚫 Não Gosta De:
                      </p>
                      <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
                        ${escapeHtml(dislikes)}
                      </p>
                    </div>`
                      : ''
                  }
                  </td>
                </tr>
              </table>`
      : '';

  const content = `
              <h2 style="color: #8B4513; margin: 0 0 15px 0; font-size: 24px;">Olá, ${escapeHtml(data.name)}!</h2>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">O sorteio do Amigo Chocolate foi realizado! 🎉</p>

              <!-- Result Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #DC143C; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 20px;">
                    <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: bold;">
                      Seu amigo chocolate é:<br>
                      <span style="font-size: 24px;">${escapeHtml(data.matchedName)}</span>
                    </p>
                  </td>
                </tr>
              </table>
${preferences}
${WARNING_BOX}

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">Acesse seu link único para ver o resultado a qualquer momento:</p>
${button(link, 'Ver Meu Resultado')}

              <p style="margin-top: 30px; color: #666666; font-size: 14px; line-height: 1.6;">
                Feliz Natal! 🎅🍫<br>
                <strong>Rainha das Sete</strong>
              </p>`;

  return layout('Amigo Chocolate - Seu sorteio está pronto!', content);
}

export function buildTestEmailHtml(publicUrl: string): string {
  const content = `
              <h2 style="color: #8B4513; margin: 0 0 15px 0; font-size: 24px;">Olá! Este é um email de teste 🧪</h2>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Se você está recebendo este email, significa que a configuração de envio de emails está funcionando corretamente! ✅</p>

              <!-- Result Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #DC143C; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 20px;">
                    <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: bold;">
                      Exemplo de resultado:<br>
                      <span style="font-size: 24px;">João Silva</span>
                    </p>
                  </td>
                </tr>
              </table>
${WARNING_BOX}

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">Este é apenas um email de teste para verificar a configuração.</p>
${button(baseUrl(publicUrl), 'Acessar Sistema')}

              <p style="margin-top: 30px; color: #666666; font-size: 14px; line-height: 1.6;">
                Feliz Páscoa! 🐰🍫<br>
                <strong>Rainha das Sete</strong>
              </p>`;

  return layout('Teste - Amigo Chocolate', content);
}

function resolve(opts: EmailOptions) {
  return {
    client: opts.client ?? defaultClient,
    apiUrl: opts.apiUrl ?? config.EMAIL_API_URL,
    publicUrl: opts.publicUrl ?? config.PUBLIC_URL,
    delayMs: opts.delayMs ?? config.EMAIL_SEND_DELAY_MS,
  };
}

function extractEmailId(data: unknown): string {
  if (typeof data === 'object' && data !== null) {
    const d = data as { id?: unknown; emailId?: unknown };
    const id = d.id || d.emailId;
    if (typeof id === 'string' || typeof id === 'number') return String(id);
  }
  return 'N/A';
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === 'string' && data.message) return data.message;
    if (error.message) return error.message;
    return `Erro HTTP ${error.response?.status}: ${error.response?.statusText}`;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Erro desconhecido';
}

async function post(
  opts: ReturnType<typeof resolve>,
  to: string,
  subject: string,
  html: string,
): Promise<string> {
  const response = await opts.client.post(
    opts.apiUrl,
    { destinatario: to, assunto: subject, body: html, isHtml: true, cc: [], bcc: [] },
    { headers: { 'Content-Type': 'application/json' }, timeout: 30_000 },
  );
  return extractEmailId(response?.data);
}

export interface ParticipantEmailInfo {
  name: string;
  email: string;
  token: string;
  preferredChocolate?: string | null;
  dislikes?: string | null;
}

export interface MatchedEmailInfo {
  name: string;
  preferredChocolate?: string | null;
  dislikes?: string | null;
}

/** Envia o e-mail de resultado para um participante. Lanca em caso de falha. */
export async function sendEmail(
  participant: ParticipantEmailInfo,
  matched: MatchedEmailInfo,
  options: EmailOptions = {},
): Promise<string> {
  const opts = resolve(options);
  const html = buildDrawEmailHtml(
    {
      name: participant.name,
      token: participant.token,
      matchedName: matched.name,
      matchedPreferredChocolate: matched.preferredChocolate,
      matchedDislikes: matched.dislikes,
    },
    opts.publicUrl,
  );
  return post(opts, participant.email, DRAW_SUBJECT, html);
}

interface BatchRow {
  id: string;
  name: string;
  email: string | null;
  token: string;
  m_name: string | null;
  m_preferred_chocolate: string | null;
  m_dislikes: string | null;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Envia, sequencialmente, para todos os participantes que ja tem match. */
export async function sendBatchEmails(
  db: Database.Database,
  options: EmailOptions = {},
): Promise<BatchResult> {
  const opts = resolve(options);
  const rows = db
    .prepare(
      `SELECT p.id, p.name, p.email, p.token, m.name AS m_name,
              m.preferred_chocolate AS m_preferred_chocolate, m.dislikes AS m_dislikes
         FROM participants p
         LEFT JOIN participants m ON m.id = p.matched_with
        WHERE p.matched_with IS NOT NULL
        ORDER BY p.created_at ASC, p.rowid ASC`,
    )
    .all() as BatchRow[];

  if (rows.length === 0) {
    return {
      success: false,
      results: [],
      errors: [{ message: 'Nenhum participante com match encontrado' }],
      message: 'Erro ao enviar emails em lote',
    };
  }

  const results: BatchResultItem[] = [];
  const errors: BatchErrorItem[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email = (row.email ?? '').trim();
    if (!email) {
      errors.push({
        participantId: row.id,
        participantName: row.name,
        email: '',
        error: 'Participante sem e-mail',
      });
      continue;
    }

    try {
      const emailId = await sendEmail(
        {
          name: row.name,
          email,
          token: row.token,
        },
        {
          name: row.m_name ?? 'Participante',
          preferredChocolate: row.m_preferred_chocolate,
          dislikes: row.m_dislikes,
        },
        opts,
      );
      results.push({
        participantId: row.id,
        participantName: row.name,
        email,
        success: true,
        emailId,
      });
    } catch (error) {
      errors.push({
        participantId: row.id,
        participantName: row.name,
        email,
        error: errorMessage(error),
      });
    }

    if (opts.delayMs > 0 && i < rows.length - 1) await sleep(opts.delayMs);
  }

  return {
    success: true,
    results,
    errors,
    message: `Emails enviados: ${results.length} sucesso, ${errors.length} erros`,
  };
}

/** E-mail de teste. Lanca em caso de falha. */
export async function testEmail(
  address: string,
  options: EmailOptions = {},
): Promise<{ success: true; message: string; emailId: string }> {
  const opts = resolve(options);
  const emailId = await post(opts, address, TEST_SUBJECT, buildTestEmailHtml(opts.publicUrl));
  return { success: true, message: 'Email de teste enviado com sucesso!', emailId };
}
