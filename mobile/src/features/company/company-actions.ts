/**
 * Ações externas disponíveis para uma empresa.
 *
 * Cada ação só aparece quando existe dado válido para executá-la — nada de
 * botões que não levam a lugar nenhum.
 */
import type { Company } from '@/types/domain';

export type CompanyActionKind =
  | 'whatsapp'
  | 'call'
  | 'map'
  | 'website'
  | 'instagram'
  | 'facebook'
  | 'share';

export interface CompanyAction {
  kind: CompanyActionKind;
  label: string;
  /** Destino da ação (telefone, endereço, url). Ausente em "Compartilhar". */
  value?: string;
}

function hasValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Normaliza o perfil do Instagram para uma url navegável. */
export function instagramUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const handle = trimmed.replace(/^@/, '');
  if (!handle) return null;
  return `https://instagram.com/${handle}`;
}

/** Lista as ações possíveis para a empresa, na ordem em que aparecem na tela. */
export function buildCompanyActions(company: Company): CompanyAction[] {
  const actions: CompanyAction[] = [];

  if (hasValue(company.whatsapp)) {
    actions.push({ kind: 'whatsapp', label: 'WhatsApp', value: company.whatsapp });
  }
  if (hasValue(company.phone)) {
    actions.push({ kind: 'call', label: 'Ligar', value: company.phone });
  }
  if (hasValue(company.address)) {
    actions.push({ kind: 'map', label: 'Como chegar', value: company.address });
  }
  if (hasValue(company.website)) {
    actions.push({ kind: 'website', label: 'Site', value: company.website });
  }

  const instagram = instagramUrl(company.instagram);
  if (instagram) {
    actions.push({ kind: 'instagram', label: 'Instagram', value: instagram });
  }

  if (hasValue(company.facebook)) {
    actions.push({ kind: 'facebook', label: 'Facebook', value: company.facebook });
  }

  actions.push({ kind: 'share', label: 'Compartilhar' });

  return actions;
}
