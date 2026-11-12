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

const COLOR = {
  ink: '#0D181C',
  red: '#E30613',
  muted: '#4A5559',
};
const FONT = "Inter, Arial, Helvetica, sans-serif";

// Logo da Rainha das Sete, servido pelo proprio site.
function logoUrl(publicUrl: string): string {
  return `${baseUrl(publicUrl)}/email-logo.png`;
}

function layout(title: string, content: string, publicUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: ${FONT}; color: ${COLOR.ink};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px;">
          <tr>
            <td align="center" style="padding: 40px 24px 32px 24px;">
              <img src="${escapeHtml(logoUrl(publicUrl))}" alt="Rainha das Sete" width="220" style="display: block; width: 220px; max-width: 100%; height: auto; border: 0;">
            </td>
          </tr>
          <tr>
            <td style="height: 4px; line-height: 4px; font-size: 0; background-color: ${COLOR.red};">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 40px 32px 16px 32px;">
${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height: 4px; line-height: 4px; font-size: 0; background-color: ${COLOR.red};">&nbsp;</td></tr>
              </table>
              <p style="margin: 16px 0 0 0; font-size: 12px; line-height: 1.6; color: ${COLOR.muted}; text-align: center;">
                Rainha das Sete · Mensagem automática, não responda a este e-mail.
              </p>
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

// Item de lista no estilo da referencia: icone na esquerda, texto na direita.
function item(icon: string, html: string): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 18px 0;">
                <tr>
                  <td valign="top" width="36" style="font-size: 22px; line-height: 1.3;">${icon}</td>
                  <td valign="top" style="font-size: 16px; line-height: 1.6; color: ${COLOR.ink};">${html}</td>
                </tr>
              </table>`;
}

function button(href: string, label: string): string {
  return `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 8px auto 0 auto;">
                <tr>
                  <td align="center" style="background-color: ${COLOR.red}; border-radius: 6px;">
                    <a href="${escapeHtml(href)}" style="display: inline-block; padding: 16px 36px; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; font-family: ${FONT};">${label}</a>
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

  const prefs = [
    choc ? item('🍫', `<strong>Chocolate preferido:</strong> ${escapeHtml(choc)}`) : '',
    dislikes ? item('🚫', `<strong>Não gosta de:</strong> ${escapeHtml(dislikes)}`) : '',
  ].join('');

  const content = `
              <h1 style="margin: 0 0 12px 0; font-size: 26px; line-height: 1.25; font-weight: 800; color: ${COLOR.red}; text-align: center;">O sorteio do Amigo Chocolate foi realizado! 🎉</h1>
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: ${COLOR.ink}; text-align: center;">Olá, ${escapeHtml(data.name)}! Quem não é louco por chocolate, é louco da cabeça.</p>

              <p style="margin: 0 0 4px 0; font-size: 15px; color: ${COLOR.muted}; text-align: center;">Seu amigo chocolate é</p>
              <p style="margin: 0 0 32px 0; font-size: 30px; line-height: 1.2; font-weight: 800; color: ${COLOR.ink}; text-align: center;">${escapeHtml(data.matchedName)}</p>

${prefs}
${item('🔒', '<strong>Mantenha o segredo!</strong> Não conte para ninguém quem você tirou.')}
${item('🔗', 'Acesse seu <strong>link único</strong> para ver o resultado a qualquer momento.')}

${button(link, 'Ver meu resultado')}

              <p style="margin: 32px 0 0 0; font-size: 15px; line-height: 1.6; color: ${COLOR.muted}; text-align: center;">
                Feliz Natal! 🎅🍫<br>
                <strong style="color: ${COLOR.ink};">Rainha das Sete</strong>
              </p>`;

  return layout('Amigo Chocolate - Seu sorteio está pronto!', content, publicUrl);
}

export function buildTestEmailHtml(publicUrl: string): string {
  const content = `
              <h1 style="margin: 0 0 12px 0; font-size: 26px; line-height: 1.25; font-weight: 800; color: ${COLOR.red}; text-align: center;">Olá! A configuração de envio está funcionando ✅</h1>
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: ${COLOR.ink}; text-align: center;">Este é apenas um email de teste para verificar a configuração.</p>

${item('🎁', '<strong>Exemplo de resultado:</strong> João Silva')}
${item('🔒', '<strong>Mantenha o segredo!</strong> Não conte para ninguém quem você tirou.')}

${button(baseUrl(publicUrl), 'Acessar sistema')}

              <p style="margin: 32px 0 0 0; font-size: 15px; line-height: 1.6; color: ${COLOR.muted}; text-align: center;">
                Feliz Páscoa! 🐰🍫<br>
                <strong style="color: ${COLOR.ink};">Rainha das Sete</strong>
              </p>`;

  return layout('Teste - Amigo Chocolate', content, publicUrl);
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
