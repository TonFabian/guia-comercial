import { StyleSheet, View } from 'react-native';

import { CompanyAnalyticsCard } from './company-analytics-card';
import { useCompanyAnalytics } from './use-company-analytics';
import { Spacing } from '@/constants/theme';
import type { Company } from '@/types/domain';

/**
 * Bloco de desempenho de uma empresa: só renderiza para plano Premium
 * (o hook resolve o gating e a chamada 403 vira ausência de card).
 */
export function CompanyPerformance({ company }: { company: Company }) {
  const summary = useCompanyAnalytics(company);
  if (!summary) return null;
  return (
    <View style={styles.gap}>
      <CompanyAnalyticsCard summary={summary} />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.two },
});
