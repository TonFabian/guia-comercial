/**
 * Conversão da utilidade pública do domínio para o card da Home.
 *
 * A cor nunca vem do banco: ela é derivada da categoria usando a paleta do
 * tema. O ícone chega como texto e só é usado quando existe na fonte de
 * ícones (MaterialCommunityIcons).
 */
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import type { PublicUtility, PublicUtilityCategory } from '@/types/domain';

export type UtilityIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Ícone usado quando o dado não informa um nome válido. */
export const DEFAULT_UTILITY_ICON: UtilityIcon = 'phone-in-talk';

/** Paleta do tema usada pelas utilidades públicas. */
export type UtilityPalette = Record<PublicUtilityCategory, string>;

/** Card de utilidade pública pronto para a tela. */
export type UtilityView = {
  id: string;
  name: string;
  description: string;
  accent: string;
  icon: UtilityIcon;
  phone: string | null;
  details: string[];
  canCall: boolean;
};

/** Valida o nome do ícone contra os nomes disponíveis na fonte de ícones. */
export function resolveUtilityIcon(
  icon: string | null | undefined,
  knownIcons: ReadonlySet<string>,
): UtilityIcon {
  if (icon && knownIcons.has(icon)) return icon as UtilityIcon;
  return DEFAULT_UTILITY_ICON;
}

/** Converte a entidade do domínio no card exibido na Home. */
export function toUtilityView(
  utility: PublicUtility,
  palette: UtilityPalette,
  knownIcons: ReadonlySet<string>,
): UtilityView {
  const phone = utility.phone?.trim() ? utility.phone.trim() : null;

  return {
    id: utility._id,
    name: utility.name,
    description: utility.description,
    accent: palette[utility.category] ?? palette.emergency,
    icon: resolveUtilityIcon(utility.icon, knownIcons),
    phone,
    details: utility.details ?? [],
    canCall: Boolean(phone),
  };
}
