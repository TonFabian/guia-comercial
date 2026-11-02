import { StyleSheet, Text, View } from 'react-native';

import { GuiaColors, Spacing, Type } from '@/constants/theme';

import { formatOpeningRange, openingStatusLabel, parseOpeningHours } from './opening-hours';

interface CompanyHoursProps {
  openingHours?: string[];
  now?: Date;
}

/** Horário de funcionamento com o status atual (aberto/fechado). */
export function CompanyHours({ openingHours, now = new Date() }: CompanyHoursProps) {
  const parsed = parseOpeningHours(openingHours ?? []);
  const status = openingStatusLabel(parsed, now);
  const isOpen = status === 'Aberto agora';

  return (
    <>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, isOpen ? styles.dotOpen : styles.dotClosed]} />
        <Text style={[styles.statusText, isOpen ? styles.statusOpen : styles.statusClosed]}>
          {status}
        </Text>
      </View>

      {parsed.map((hour) => (
        <View key={hour.raw} style={styles.row}>
          <Text style={styles.label}>{hour.label}</Text>
          <Text style={styles.range}>{formatOpeningRange(hour)}</Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.two,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOpen: {
    backgroundColor: GuiaColors.success,
  },
  dotClosed: {
    backgroundColor: GuiaColors.textSecondary,
  },
  statusText: {
    fontSize: Type.body,
    fontWeight: '700',
  },
  statusOpen: {
    color: GuiaColors.success,
  },
  statusClosed: {
    color: GuiaColors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: GuiaColors.border,
  },
  label: {
    color: GuiaColors.text,
    fontSize: Type.body,
  },
  range: {
    color: GuiaColors.textSecondary,
    fontSize: Type.body,
  },
});
