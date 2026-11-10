import type { Company } from '@/types/domain';

import type { WorkingHours } from './company-details';
import { buildCompanyDetails } from './company-details';
import { getOpeningStatus, isOpenNowFromSchedule } from './opening-hours';

export type CompanyDetailVariant = 'full' | 'free';

export type CompanyFreeStatusKind = 'open' | 'closed' | 'unknown';
export type CompanyFreeStatusTone = 'success' | 'error' | 'muted';

export type CompanyFreeStatus = {
  kind: CompanyFreeStatusKind;
  label: string;
  tone: CompanyFreeStatusTone;
};

export type CompanyFreeHoursRow = {
  key: keyof WorkingHours;
  label: string;
  value: string;
  closed: boolean;
};

export type CompanyFreeView = {
  id: string;
  name: string;
  coverUrl?: string;
  category: string;
  description: string;
  addressLine?: string;
  status: CompanyFreeStatus;
  hoursRows: CompanyFreeHoursRow[];
  phone?: string;
  whatsapp?: string;
  hasContact: boolean;
};

const EMPTY_DESCRIPTION = 'Informações em breve.';
const CLOSED_HOURS = 'Fechado';
const CONSULT_HOURS = 'Consulte';

const STATUS_LABELS: Record<
  CompanyFreeStatusKind,
  { label: string; tone: CompanyFreeStatusTone }
> = {
  open: { label: 'Aberto agora', tone: 'success' },
  closed: { label: 'Fechado agora', tone: 'error' },
  unknown: { label: 'Consulte', tone: 'muted' },
};

const HOURS_ROWS: readonly { key: keyof WorkingHours; label: string }[] = [
  { key: 'weekdays', label: 'Segunda à sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export function companyDetailVariant(company: Company): CompanyDetailVariant {
  return company.isFeatured === true ? 'full' : 'free';
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function buildStatus(
  company: Company,
  workingHours: WorkingHours,
  now: Date,
): CompanyFreeStatus {
  const fromSchedule = isOpenNowFromSchedule(company.schedule ?? [], now);
  const kind: CompanyFreeStatusKind =
    fromSchedule === null ? getOpeningStatus(workingHours, now) : fromSchedule ? 'open' : 'closed';
  const { label, tone } = STATUS_LABELS[kind];
  return { kind, label, tone };
}

function isClosedHours(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized === CLOSED_HOURS.toLowerCase() || normalized.includes(CONSULT_HOURS.toLowerCase());
}

export function buildCompanyFreeView(company: Company, now: Date): CompanyFreeView {
  const details = buildCompanyDetails(company);
  const description = normalizeText(company.description) || EMPTY_DESCRIPTION;
  const addressLine = [details.city, details.address].filter(Boolean).join(' • ') || undefined;
  const phone = company.phone ?? undefined;
  const whatsapp = company.whatsapp ?? undefined;

  return {
    id: details.id,
    name: details.name,
    coverUrl: company.cover || company.logo || undefined,
    category: details.category,
    description,
    addressLine,
    status: buildStatus(company, details.workingHours, now),
    hoursRows: HOURS_ROWS.map((row) => {
      const value = details.workingHours[row.key];
      return { ...row, value, closed: isClosedHours(value) };
    }),
    phone,
    whatsapp,
    hasContact: Boolean(phone || whatsapp),
  };
}
