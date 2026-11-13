import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));

vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

import { sanitizeEmailHtml, sendEmail } from './email.service.js';

describe('sanitizeEmailHtml', () => {
  it('remove <script>, atributos on* e URIs javascript:', () => {
    const sujo = '<p onclick="hack()">Oi <script>alert(1)</script><a href="javascript:evil()">x</a></p>';
    const limpo = sanitizeEmailHtml(sujo);
    expect(limpo).not.toContain('script');
    expect(limpo).not.toContain('onclick');
    expect(limpo).not.toContain('javascript:');
  });
});

describe('sendEmail — transporte smtp', () => {
  beforeEach(() => {
    sendMail.mockReset();
    vi.stubEnv('EMAIL_TRANSPORT', 'smtp');
    vi.stubEnv('SMTP_HOST', 'smtp.teste');
    vi.stubEnv('SMTP_PORT', '587');
    vi.stubEnv('SMTP_USER', 'user');
    vi.stubEnv('SMTP_PASS', 'pass');
    vi.stubEnv('SMTP_FROM', 'Guia <no-reply@teste.com>');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('envia via nodemailer com cc/bcc e HTML sanitizado', async () => {
    await sendEmail({
      to: 'loja@teste.com',
      subject: 'Assunto',
      html: '<p>Olá <script>x()</script></p>',
      cc: ['copia@teste.com'],
    });
    expect(sendMail).toHaveBeenCalledOnce();
    const arg = sendMail.mock.calls[0]?.[0] as { html: string; cc?: string[] };
    expect(arg.html).not.toContain('script');
    expect(arg.cc).toEqual(['copia@teste.com']);
  });

  it('sem SMTP_HOST configurado: warn e NÃO lança', async () => {
    vi.stubEnv('SMTP_HOST', '');
    await expect(sendEmail({ to: 'a@b.c', subject: 's', html: '<p>x</p>' })).resolves.toBeUndefined();
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe('sendEmail — transporte http', () => {
  beforeEach(() => {
    sendMail.mockReset();
    vi.stubEnv('EMAIL_TRANSPORT', 'http');
    vi.stubEnv('EMAIL_API_URL', 'https://email-api.teste/send');
    vi.stubEnv('EMAIL_API_SECRET', 'segredo');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('POST {to, subject, body, cc, bcc} com Bearer secret', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await sendEmail({ to: 'a@b.c', subject: 's', html: '<p>x</p>', bcc: ['b@b.c'] });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://email-api.teste/send');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer segredo');
    expect(JSON.parse(String(init.body))).toMatchObject({ to: 'a@b.c', subject: 's', body: '<p>x</p>', bcc: ['b@b.c'] });
  });
});
