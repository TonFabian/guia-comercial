import type { PublicUtility } from '@/types/domain';

/**
 * Serviços de utilidade pública exibidos na Home.
 *
 * Dados de exemplo usados apenas como fallback quando o backend não
 * responde (em desenvolvimento). A cor do card vem do tema, por categoria —
 * nunca do dado.
 *
 * Sem telefone local confirmado, o campo fica ausente e o card abre os
 * detalhes — nunca discamos um número inventado.
 */
export const MOCK_PUBLIC_UTILITIES: PublicUtility[] = [
  {
    _id: 'policia-militar',
    name: 'Polícia Militar',
    description: 'Emergência em Castelo do Piauí',
    category: 'emergency',
    icon: 'shield-alert',
    phone: '190',
    active: true,
    order: 1,
  },
  {
    _id: 'policia-civil',
    name: 'Polícia Civil',
    description: 'Ocorrências e denúncias',
    category: 'civil',
    icon: 'shield-account',
    phone: '197',
    active: true,
    order: 2,
  },
  {
    _id: 'hospital-nilo-lima',
    name: 'Hospital Nilo Lima',
    description: 'Pronto atendimento municipal',
    category: 'health',
    icon: 'hospital-building',
    details: [
      'O telefone direto da unidade ainda não foi cadastrado.',
      'Consulte a escala de plantão na recepção do hospital.',
      'Em emergências, acione o SAMU pelo 192.',
    ],
    active: true,
    order: 3,
  },
  {
    _id: 'coleta-de-lixo',
    name: 'Coleta de Lixo',
    description: 'Dias e horários por bairro',
    category: 'sanitation',
    icon: 'trash-can-outline',
    details: [
      'O cronograma por bairro ainda não foi cadastrado.',
      'Consulte a Secretaria de Limpeza Urbana do município para confirmar dias e horários.',
    ],
    active: true,
    order: 4,
  },
];
