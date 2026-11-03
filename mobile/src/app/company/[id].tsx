import { useLocalSearchParams } from 'expo-router';

import { CompanyDetailScreen } from '@/features/company/company-detail-screen';

export default function CompanyDetailRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const companyId = Array.isArray(params.id) ? params.id[0] : params.id;

  return <CompanyDetailScreen companyId={companyId ?? ''} />;
}
