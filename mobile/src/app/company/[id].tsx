import { useLocalSearchParams } from 'expo-router';

import { CompanyDetailScreen } from '@/features/company/company-detail-screen';

export default function CompanyDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return <CompanyDetailScreen key={id ?? ''} companyId={id ?? ''} />;
}
