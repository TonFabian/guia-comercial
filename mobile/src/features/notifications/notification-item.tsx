import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { AppNotification } from '@/types/domain';
import { tempoRelativo } from './tempo-relativo';

export function NotificationItem({ item, onPress }: { item: AppNotification; onPress: (item: AppNotification) => void }) {
  const colors = useThemeColors();
  const unread = !item.readAt;
  const icon = item.type === 'coupon' ? 'pricetag-outline' : 'calendar-outline';
  return (
    <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => onPress(item)} accessibilityRole="button" accessibilityLabel={item.title}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }, unread && styles.unread]} numberOfLines={2}>{item.title}</Text>
        {item.body ? <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={2}>{item.body}</Text> : null}
        <Text style={[styles.time, { color: colors.textSecondary }]}>{tempoRelativo(item.createdAt)}</Text>
      </View>
      {unread ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 2 },
  title: { ...Typography.body, fontFamily: FontFamily.body600, fontWeight: FontWeight.semibold },
  unread: { fontFamily: FontFamily.body700, fontWeight: FontWeight.bold },
  body: { ...Typography.caption },
  time: { ...Typography.caption, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});