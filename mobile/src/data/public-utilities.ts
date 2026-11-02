import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { UtilityColors } from '@/constants/theme';

export interface PublicUtility {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  accent: string;
  action: 'call' | 'details';
  phone?: string;
  details?: string[];
}

/**
 * Dados de utilidade pública exibidos na Home.
 *
 * Sem telefone local confirmado, o campo fica ausente e o card abre os
 * detalhes — nunca discamos um número inventado.
 */
export const MOCK_PUBLIC_UTILITIES: PublicUtility[] = [
  {
    id: 'policia-militar',
    name: 'Polícia Militar',
    description: 'Emergência em Castelo do Piauí',
    icon: 'shield-alert',
    accent: UtilityColors.emergency,
    action: 'call',
    phone: '190',
  },
  {
    id: 'policia-civil',
    name: 'Polícia Civil',
    description: 'Ocorrências e denúncias',
    icon: 'shield-account',
    accent: UtilityColors.civil,
    action: 'call',
    phone: '197',
  },
  {
    id: 'hospital-nilo-lima',
    name: 'Hospital Nilo Lima',
    description: 'Pronto atendimento municipal',
    icon: 'hospital-building',
    accent: UtilityColors.health,
    action: 'details',
    details: [
      'O telefone direto da unidade ainda não foi cadastrado.',
      'Consulte a escala de plantão na recepção do hospital.',
      'Em emergências, acione o SAMU pelo 192.',
    ],
  },
  {
    id: 'coleta-de-lixo',
    name: 'Coleta de Lixo',
    description: 'Dias e horários por bairro',
    icon: 'trash-can',
    accent: UtilityColors.sanitation,
    action: 'details',
    details: [
      'O cronograma por bairro ainda não foi cadastrado.',
      'Consulte a Secretaria de Limpeza Urbana do município para confirmar dias e horários.',
    ],
  },
];
