import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { GuiaColors, Type } from '@/constants/theme';

export function SectionHeader({
  title,
  icon,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={GuiaColors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: GuiaColors.text,
    fontSize: Type.section,
    fontWeight: '700',
  },
});
