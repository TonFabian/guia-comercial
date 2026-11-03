import type { Company } from '@/types/domain';

export type MappableCompany = Company & {
  latitude: number;
  longitude: number;
};

export type InteractiveMapProps = {
  companies: MappableCompany[];
};
