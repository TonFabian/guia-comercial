export type PlanEmailKind = 'expiring-7d' | 'expiring-1d' | 'expired';

export interface PlanEmailInput {
  ownerName: string;
  companyName: string;
  planLabel: string;
  expiresAt: string;
  ctaHref: string;
}

/** Dados de usuário não podem virar HTML no e-mail. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CORES = {
  fundoEscuro: '#121212',
  primario: '#FFC107',
  primarioDim: '#8A6508',
  textoClaro: '#FFFFFF',
  textoSuave: '#9CA3AF',
  fundoCorpo: '#F4F4F5',
  divisoria: '#E4E4E7',
} as const;

interface ConteudoDoEmail {
  destaque: string;
  corpo: string[];
  cta: string;
  /** Título do bloco de benefícios (vazio = não mostra o bloco). */
  beneficiosTitulo?: string;
}

/** Benefícios reais dos planos, conforme o gating de features do MVP. */
const BENEFICIOS: Record<'Premium' | 'Básico', string[]> = {
  Premium: [
    'Destaque na tela inicial',
    'Prioridade na busca',
    'Selo verificado e badge de plano',
    'Catálogo ilimitado de produtos e serviços clicáveis',
    'Cupom patrocinado',
    'Desempenho dos últimos 30 dias (visitas e cliques no WhatsApp)',
  ],
  'Básico': [
    'Prioridade na busca',
    'Badge de plano no perfil',
    'Galeria de fotos',
    'Promoções',
    'Mapa com a localização da empresa',
  ],};

function listaBeneficios(planLabel: string): string {
  const itens = BENEFICIOS[planLabel === 'Premium' ? 'Premium' : 'Básico'];
  return itens
    .map(
      (item) =>
        `<tr><td style="padding:6px 0;color:#3F3F46;font-size:14px;line-height:22px;">` +
        `<span style="color:${CORES.primarioDim};font-weight:bold;">✓</span>&nbsp;&nbsp;${item}</td></tr>`,
    )
    .join('');
}

const CONTEUDOS: Record<PlanEmailKind, ConteudoDoEmail> = {
  'expiring-7d': {
    destaque: 'Seu plano <strong>Plano</strong> vence em <strong>7 dias</strong>!',
    corpo: [
      'O plano <strong>{PLANO}</strong> da empresa <strong>{EMPRESA}</strong> vence em 7 dias, no dia <strong>{DATA}</strong>.',
      'Para manter os benefícios do plano no guia, renove com a nossa equipe.',
    ],
    cta: 'Falar com a equipe',
    beneficiosTitulo: 'Ao renovar, você continua com:',
  },
  'expiring-1d': {
    destaque: 'Seu plano vence <strong>amanhã</strong>!',
    corpo: [
      'O plano <strong>{PLANO}</strong> da empresa <strong>{EMPRESA}</strong> vence <strong>amanhã</strong>, no dia <strong>{DATA}</strong>.',
      'Quer renovar para continuar aparecendo em destaque no guia? Fale com a nossa equipe hoje mesmo.',
    ],
    cta: 'Falar com a equipe',
  },
  expired: {
    destaque: 'Seu plano <strong>expirou</strong>',
    corpo: [
      'O plano da empresa <strong>{EMPRESA}</strong> expirou no dia <strong>{DATA}</strong> e a página voltou ao <strong>formato gratuito</strong>.',
      'Sua empresa continua no guia, mas sem os benefícios do plano. Ao renovar, você recupera tudo na hora:',
    ],
    cta: 'Falar com a equipe',
    beneficiosTitulo: 'Ao renovar, você volta a ter:',
  },
};

/** Linha/parágrafo do corpo com os dados substituídos e escapados. */
function texto(corpo: string[], input: PlanEmailInput): string {
  const dados = {
    PLANO: escapeHtml(input.planLabel),
    EMPRESA: escapeHtml(input.companyName),
    DATA: escapeHtml(input.expiresAt),
  };
  return corpo.map((paragrafo) => `<p>${paragrafo.replace(/\{(PLANO|EMPRESA|DATA)\}/g, (_, chave: keyof typeof dados) => dados[chave])}</p>`).join('');
}

/**
 * E-mail com marca do guia, no padrão do print de referência: faixa de
 * topo com logo, título grande, saudação com o nome do dono, corpo em
 * parágrafos curtos, botão de ação e rodapé. Layout de <table> + estilos
 * inline (clientes de e-mail não respeitam CSS externo).
 */
export function buildPlanEmail(kind: PlanEmailKind, input: PlanEmailInput): string {
  const conteudo = CONTEUDOS[kind];
  const destaque = conteudo.destaque.replace('<strong>Plano</strong>', `<strong>${escapeHtml(input.planLabel)}</strong>`);
  const saudacao = input.ownerName.trim() ? `Olá, <strong>${escapeHtml(input.ownerName)}</strong>` : 'Olá';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Guia Comercial</title></head>
<body style="margin:0;padding:0;background:${CORES.fundoCorpo};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CORES.fundoCorpo};padding:24px 0;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;font-family:Arial,Helvetica,sans-serif;">
    <!-- Faixa de marca -->
    <tr><td style="background:${CORES.fundoEscuro};padding:40px 40px 32px 40px;border-radius:16px 16px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="background:${CORES.primario};border-radius:10px;padding:10px 16px;">
          <span style="color:${CORES.fundoEscuro};font-size:22px;font-weight:bold;letter-spacing:1px;">Guia&nbsp;Comercial</span>
        </td>
      </tr></table>
      <div style="color:${CORES.textoClaro};font-size:28px;font-weight:bold;line-height:36px;padding-top:28px;">${destaque}</div>
    </td></tr>
    <!-- Corpo -->
    <tr><td style="background:${CORES.textoClaro};padding:36px 40px 32px 40px;">
      <div style="color:${CORES.fundoEscuro};font-size:20px;font-weight:bold;padding-bottom:12px;">${saudacao}</div>
      <div style="color:#3F3F46;font-size:15px;line-height:24px;">${texto(conteudo.corpo, input)}</div>
      ${conteudo.beneficiosTitulo ? `<div style="color:${CORES.fundoEscuro};font-size:15px;font-weight:bold;padding-top:16px;">${conteudo.beneficiosTitulo}</div>
      <table role="presentation" cellpadding="0" cellspacing="0">${listaBeneficios(input.planLabel)}</table>` : ''}
      <table role="presentation" cellpadding="0" cellspacing="0" style="padding-top:28px;"><tr>
        <td style="background:${CORES.primario};border-radius:28px;">
          <a href="${escapeHtml(input.ctaHref)}" style="display:inline-block;padding:14px 40px;color:${CORES.fundoEscuro};font-size:15px;font-weight:bold;text-decoration:none;">${conteudo.cta}</a>
        </td>
      </tr></table>
    </td></tr>
    <!-- Rodapé (card branco contínuo, divisor sutil) -->
    <tr><td style="background:${CORES.textoClaro};border-radius:0 0 16px 16px;padding:0 40px 24px 40px;">
      <div style="border-top:1px solid ${CORES.divisoria};padding-top:18px;">
        <p style="color:${CORES.textoSuave};font-size:12px;line-height:18px;margin:0;">
          Você recebe este e-mail porque é titular da empresa ${escapeHtml(input.companyName)} no Guia Comercial.
          Este é um aviso automático sobre a vigência do plano — enviado no dia ${escapeHtml(input.expiresAt)} ou próximo dela.
        </p>
      </div>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}
