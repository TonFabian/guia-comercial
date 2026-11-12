import nodemailer from 'nodemailer';
import sanitizeHtml from 'sanitize-html';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  cc?: string[];
  bcc?: string[];
}

export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt'],
    },
  });
}

function smtpConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

async function enviarPorSmtp(msg: EmailMessage): Promise<void> {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: msg.to,
    subject: msg.subject,
    html: sanitizeEmailHtml(msg.html),
    cc: msg.cc,
    bcc: msg.bcc,
  });
}

async function enviarPorHttp(msg: EmailMessage): Promise<void> {
  const url = process.env.EMAIL_API_URL;
  const secret = process.env.EMAIL_API_SECRET;
  if (!url) {
    console.warn('[email] EMAIL_TRANSPORT=http sem EMAIL_API_URL — e-mail não enviado');
    return;
  }
  const resposta = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({
      to: msg.to,
      subject: msg.subject,
      body: sanitizeEmailHtml(msg.html),
      ...(msg.cc ? { cc: msg.cc } : {}),
      ...(msg.bcc ? { bcc: msg.bcc } : {}),
    }),
  });
  if (!resposta.ok) {
    throw Object.assign(new Error(`falha ao enviar e-mail (HTTP ${resposta.status})`), { statusCode: 502 });
  }
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const transporte = process.env.EMAIL_TRANSPORT ?? 'smtp';
  if (transporte === 'http') {
    await enviarPorHttp(msg);
    return;
  }
  if (!smtpConfigurado()) {
    console.warn('[email] SMTP não configurado (EMAIL_TRANSPORT=smtp) — e-mail não enviado');
    return;
  }
  await enviarPorSmtp(msg);
}
