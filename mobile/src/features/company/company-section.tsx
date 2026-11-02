import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { GuiaColors, Radius, Spacing, Type } from '@/constants/theme';

interface CompanySectionProps {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  children: ReactNode;
}

/** Bloco de conteúdo da tela da empresa: título com ícone + card. */
export function CompanySection({ title, icon, children }: CompanySectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name={icon} size={18} color={GuiaColors.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  title: {
    color: GuiaColors.text,
    fontSize: Type.title,
    fontWeight: '700',
  },
  card: {
    marginHorizontal: Spacing.three,
    backgroundColor: GuiaColors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
