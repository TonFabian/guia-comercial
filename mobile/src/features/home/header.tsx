import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Spacing, Typography, FontFamily, FontWeight, Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { formatBadgeCount } from '@/features/notifications/badge-count';
import { useUnread } from '@/features/notifications/use-unread';

export function Header({ city }: { city?: string }) {
  const colors = useThemeColors();
  const router = useRouter();
  const { count } = useUnread();
  const styles = makeStyles(colors);
  const badgeLabel = formatBadgeCount(count);
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.locationButton} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Cidade atual">
          <Ionicons name="location-sharp" size={18} color={colors.primary} />
          <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">{city ?? 'Castelo do Piauí'}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => router.push('/notifications')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Notificações"
        >
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {badgeLabel ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
      <Text style={styles.headerTitle}>
        Busque no maior guia de empresas da cidade.
      </Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: Spacing.three,
      paddingTop: 12,
      paddingBottom: Spacing.three,
      gap: 12,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      flexShrink: 1,
    },
    locationText: {
      color: colors.text,
      ...Typography.body,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
      maxWidth: 180,
      flexShrink: 1,
    },
    bellButton: {
      position: 'relative',
      padding: Spacing.one,
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 16,
      height: 16,
      borderRadius: Radius.circle,
      backgroundColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.half,
    },
    badgeText: {
      color: '#FFFFFF',
      ...Typography.captionSemibold,
    },
    headerTitle: {
      color: colors.text,
      ...Typography.h4,
      fontFamily: FontFamily.heading700,
      fontWeight: FontWeight.bold,
    },
  });
}