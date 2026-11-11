import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { CompanyAnalyticsSummary } from '@/services/api';

/** Card "Desempenho (30 dias)": contadores simples da feature Premium. */
export function CompanyAnalyticsCard({ summary }: { summary: CompanyAnalyticsSummary | null }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  if (!summary) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Desempenho (30 dias)</Text>
      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={styles.value}>{summary.views}</Text>
          <Text style={styles.label}>Visitas</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.value}>{summary.whatsappClicks}</Text>
          <Text style={styles.label}>Cliques no WhatsApp</Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.three,
      gap: Spacing.two,
    },
    title: { color: colors.textSecondary, ...Typography.label },
    row: { flexDirection: 'row', gap: Spacing.three },
    metric: { flex: 1, gap: 2 },
    value: { color: colors.primary, ...Typography.h3 },
    label: { color: colors.textSecondary, ...Typography.caption },
  });
}
