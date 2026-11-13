/**
 * Metadados de UX para o seletor de deep link do Push Center (admin).
 *
 * Não altera a whitelist (`DEEP_LINK_ROTAS`), que segue espelhando literalmente
 * a do backend. Aqui apenas descrevemos, em português, o que cada rota abre no
 * app e se ela exige um identificador.
 */
export interface DeepLinkMeta {
  /** Rótulo curto mostrado no <select>. */
  label: string;
  /** O que a tela faz (tooltip/ajuda). */
  descricao: string;
  /** Se a rota exige um ID/slug ao final. */
  precisaId: boolean;
  /** Exemplo de uso para orientar o admin. */
  exemplo?: string;
}

export const DEEP_LINK_META: Record<string, DeepLinkMeta> = {
  '/': {
    label: 'Início (home)',
    descricao: 'Abre a tela inicial do app, com os destaques e categorias.',
    precisaId: false,
  },
  '/(tabs)/search': {
    label: 'Busca',
    descricao: 'Abre a aba de busca de empresas/serviços.',
    precisaId: false,
  },
  '/(tabs)/favorites': {
    label: 'Favoritos',
    descricao: 'Abre a lista de empresas favoritadas pelo usuário.',
    precisaId: false,
  },
  '/(tabs)/profile': {
    label: 'Perfil',
    descricao: 'Abre a tela de perfil do usuário logado.',
    precisaId: false,
  },
  '/company/': {
    label: 'Empresa específica',
    descricao: 'Abre a página de uma empresa (detalhes, contato, cupons).',
    precisaId: true,
    exemplo: 'Cole o _id da empresa (ex.: 6af72a0babf3fcc36e06d55d).',
  },
  '/event/': {
    label: 'Evento específico',
    descricao: 'Abre a página de um evento da agenda.',
    precisaId: true,
    exemplo: 'Cole o _id do evento.',
  },
  '/tourist-spot/': {
    label: 'Atração turística',
    descricao: 'Abre a página de uma atração turística.',
    precisaId: true,
    exemplo: 'Cole o _id da atração.',
  },
  '/job/': {
    label: 'Vaga de emprego',
    descricao: 'Abre uma vaga publicada no app.',
    precisaId: true,
    exemplo: 'Cole o _id da vaga.',
  },
  '/autonomous/': {
    label: 'Profissional autônomo',
    descricao: 'Abre a página de um profissional autônomo.',
    precisaId: true,
    exemplo: 'Cole o _id do profissional.',
  },
  '/map': {
    label: 'Mapa',
    descricao: 'Abre o mapa com empresas e atrações próximas.',
    precisaId: false,
  },
  '/my-company': {
    label: 'Minha empresa',
    descricao: 'Abre o painel "minha empresa" do usuário (só faz sentido para donos de empresa).',
    precisaId: false,
  },
  '/announce': {
    label: 'Anunciar',
    descricao: 'Abre a tela de anúncio/publicidade no app.',
    precisaId: false,
  },
};

export function deepLinkLabel(prefixo: string): string {
  return DEEP_LINK_META[prefixo]?.label ?? prefixo;
}

export function deepLinkDescricao(prefixo: string): string {
  return DEEP_LINK_META[prefixo]?.descricao ?? '';
}

export function deepLinkPrecisaId(prefixo: string): boolean {
  return DEEP_LINK_META[prefixo]?.precisaId ?? false;
}
