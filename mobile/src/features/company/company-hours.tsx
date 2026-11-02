import { StyleSheet, Text, View } from 'react-native';

import { Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

import { formatOpeningRange, openingStatusLabel, parseOpeningHours, scheduleToOpeningHours } from './opening-hours';

interface CompanyHoursProps {
  openingHours?: string[];
  schedule?: { day: number; opens: number; closes: number }[];
  now?: Date;
}

/** Horário de funcionamento com o status atual (aberto/fechado). */
export function CompanyHours({ openingHours, schedule, now = new Date() }: CompanyHoursProps) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const parsed = schedule && schedule.length > 0
    ? scheduleToOpeningHours(schedule)
    : parseOpeningHours(openingHours ?? []);
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

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
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
      backgroundColor: colors.success,
    },
    dotClosed: {
      backgroundColor: colors.textSecondary,
    },
    statusText: {
      fontSize: Type.body,
      fontWeight: '700',
    },
    statusOpen: {
      color: colors.success,
    },
    statusClosed: {
      color: colors.textSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.two,
      paddingVertical: 6,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    label: {
      color: colors.text,
      fontSize: Type.body,
    },
    range: {
      color: colors.textSecondary,
      fontSize: Type.body,
    },
  });
}
