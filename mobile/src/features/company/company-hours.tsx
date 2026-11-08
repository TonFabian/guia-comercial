import { StyleSheet, Text, View } from 'react-native';

import { Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

import { isOpenNowFromSchedule } from './opening-hours';

interface CompanyHoursProps {
  schedule?: { day: number; opens: number; closes: number }[];
  now?: Date;
}

/** Horário de funcionamento com o status atual (aberto/fechado). */
export function CompanyHours({ schedule, now = new Date() }: CompanyHoursProps) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const scheduleAtivo = schedule && schedule.length > 0 ? schedule : undefined;
  // Sem schedule (ou vazio): horário não informado — sem inferência.
  const open = scheduleAtivo
    ? isOpenNowFromSchedule(scheduleAtivo, now)
    : null;
  const status = open === null
    ? 'Horário não informado'
    : open
      ? 'Aberto agora'
      : 'Fechado agora';
  const isOpen = open === true;

  return (
    <>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, isOpen ? styles.dotOpen : styles.dotClosed]} />
        <Text style={[styles.statusText, isOpen ? styles.statusOpen : styles.statusClosed]}>
          {status}
        </Text>
      </View>


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
            ...Typography.body,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
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
      ...Typography.body,
    },
    range: {
      color: colors.textSecondary,
      ...Typography.body,
    },
  });
}
