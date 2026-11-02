import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

export type UtilityIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Ação disparada ao tocar no atalho. */
export type UtilityAction =
  | { kind: 'pharmacy' }
  | { kind: 'search'; term: string }
  | { kind: 'emergency-phones' };

export type PublicUtility = {
  id: string;
  title: string;
  description: string;
  icon: UtilityIcon;
  action: UtilityAction;
};

/** Telefone de emergência de alcance nacional. */
export type EmergencyPhone = {
  id: string;
  label: string;
  number: string;
};

/** Destino do atalho depois do toque. */
export type UtilityDestination =
  | { kind: 'company'; companyId: string }
  | { kind: 'search'; term: string }
  | { kind: 'emergency-phones' };

export const EMERGENCY_PHONES: EmergencyPhone[] = [
  { id: 'policia', label: 'Polícia Militar', number: '190' },
  { id: 'bombeiros', label: 'Corpo de Bombeiros', number: '193' },
  { id: 'samu', label: 'SAMU', number: '192' },
];

export const PUBLIC_UTILITIES: PublicUtility[] = [
  {
    id: 'pharmacy',
    title: 'Plantão de Farmácias',
    description: 'Farmácias abertas agora na cidade',
    icon: 'medical-bag',
    action: { kind: 'pharmacy' },
  },
  {
    id: 'fuel',
    title: 'Postos de Combustível',
    description: 'Onde abastecer e preços da cidade',
    icon: 'gas-station',
    action: { kind: 'search', term: 'posto de combustível' },
  },
  {
    id: 'emergency-phones',
    title: 'Telefones Úteis',
    description: 'Emergências e serviços da cidade',
    icon: 'phone-in-talk',
    action: { kind: 'emergency-phones' },
  },
  {
    id: 'bus',
    title: 'Ônibus e Transporte',
    description: 'Linhas e horários do transporte urbano',
    icon: 'bus-clock',
    action: { kind: 'search', term: 'ônibus' },
  },
  {
    id: 'trash',
    title: 'Coleta de Lixo',
    description: 'Cronograma de coleta por bairro',
    icon: 'trash-can-outline',
    action: { kind: 'search', term: 'coleta de lixo' },
  },
];

/**
 * Define para onde o atalho leva. Sem farmácia de plantão carregada, o
 * atalho de farmácia cai na busca em vez de não levar a lugar nenhum.
 */
export function resolveUtilityDestination(
  utility: PublicUtility,
  pharmacyId: string | null,
): UtilityDestination {
  if (utility.action.kind === 'search') {
    return { kind: 'search', term: utility.action.term };
  }
  if (utility.action.kind === 'pharmacy') {
    return pharmacyId
      ? { kind: 'company', companyId: pharmacyId }
      : { kind: 'search', term: 'farmácia' };
  }
  return { kind: 'emergency-phones' };
}
