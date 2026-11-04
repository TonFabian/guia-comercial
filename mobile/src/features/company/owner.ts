import type { Company } from '@/types/domain';

export function filterOwnedCompanies(companies: Company[], clerkId?: string): Company[] {
  if (!clerkId) return [];
  return companies.filter((c) => c.ownerClerkId === clerkId);
}

export function resolveContactNumbers(
  phone: string,
  whatsapp: string,
  samePhone: boolean,
): { phone?: string; whatsapp?: string } {
  const p = phone.trim() || undefined;
  const w = samePhone ? p : (whatsapp.trim() || undefined);
  return { phone: p, whatsapp: w };
}