/**
 * Gera pré-visualizações HTML dos e-mails do ciclo de planos usando o
 * template REAL de produção (email-templates.ts). Saída: arquivos .html
 * na pasta indicada, para abrir no navegador como "preview".
 *
 * Uso: node dist/backend/scripts/preview-emails.js [pasta-saida]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildPlanEmail } from '../src/services/email-templates.js';

const pasta = process.argv[2] ?? join(process.cwd(), 'email-previews');
mkdirSync(pasta, { recursive: true });

// Nome de usuária fictício (exigência: não usar dados reais).
const base = {
  ownerName: 'Mariana Alves',
  companyName: 'Doceria da Mariana',
  planLabel: 'Premium',
  ctaHref: 'https://guiacomercial.exemplo.com',
};

const emails: Array<{
  arquivo: string;
  kind: 'expiring-7d' | 'expiring-1d' | 'expired';
  planLabel?: string;
  expiresAt: string;
}> = [
  { arquivo: 'email-1-vence-em-7-dias.html', kind: 'expiring-7d', expiresAt: '07/12/2026' },
  { arquivo: 'email-2-vence-amanha.html', kind: 'expiring-1d', expiresAt: '06/12/2026' },
  { arquivo: 'email-3-plano-expirou.html', kind: 'expired', expiresAt: '05/12/2026' },
  { arquivo: 'email-4-basico-vence-em-7-dias.html', kind: 'expiring-7d', planLabel: 'Básico', expiresAt: '07/12/2026' },
];

for (const email of emails) {
  const html = buildPlanEmail(email.kind, { ...base, planLabel: email.planLabel ?? base.planLabel, expiresAt: email.expiresAt });
  const caminho = join(pasta, email.arquivo);
  writeFileSync(caminho, html, 'utf8');
  console.log(caminho);
}
