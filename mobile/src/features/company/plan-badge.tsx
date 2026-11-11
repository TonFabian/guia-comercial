import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, FontWeight, Overlays, Radius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { planLabel } from './company-plan';
import type { Plan } from './company-plan';

interface PlanBadgeProps {
  plan: Plan | string | undefined | null;
}

/** Chip visual do plano da empresa (Premium em destaque, Gratuito discreto). */
export function PlanBadge({ plan }: PlanBadgeProps) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const normalized = plan === 'basic' || plan === 'premium' ? plan : 'free';
  const label = planLabel(normalized);

  const premium = normalized === 'premium';
  const basic = normalized === 'basic';

  return (
    <View
      style={[
        styles.badge,
        premium && styles.badgePremium,
        basic && styles.badgeBasic,
        !premium && !basic && styles.badgeFree,
      ]}
      accessibilityLabel={`Plano ${label}`}
    >
      <Text
        style={[
          styles.text,
          premium && styles.textPremium,
          basic && styles.textBasic,
          !premium && !basic && styles.textFree,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    badge: {
      borderRadius: Radius.chip,
      paddingVertical: Spacing.half,
      paddingHorizontal: Spacing.two,
      borderWidth: 1,
    },
    badgePremium: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    badgeBasic: {
      backgroundColor: Overlays.amberTag,
      borderColor: colors.primary,
    },
    badgeFree: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.border,
    },
    text: {
      ...Typography.captionSemibold,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    textPremium: {
      color: colors.background,
    },
    textBasic: {
      color: colors.primary,
    },
    textFree: {
      color: colors.textSecondary,
    },
  });
}