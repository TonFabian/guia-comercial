import { NativeTabs } from 'expo-router/native-tabs';
import { Platform, StyleSheet, View } from 'react-native';

import { Glass, FontWeight, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function AppTabs() {
  const colors = useThemeColors();
  return (
    <NativeTabs
      backgroundColor={Platform.select({
        ios: Glass.tabBar,
        default: colors.background,
      })}
      tintColor={colors.primary}
      iconColor={{ default: colors.textSecondary, selected: colors.primary }}
      blurEffect="systemChromeMaterialDark"
      disableTransparentOnScrollEdge
      disableIndicator
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.primary, fontWeight: FontWeight.semibold },
      }}>
      <NativeTabs.Trigger name="index">
        <View style={styles.triggerContent}>
          <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
          <NativeTabs.Trigger.Label>Início</NativeTabs.Trigger.Label>
        </View>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <View style={styles.triggerContent}>
          <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
          <NativeTabs.Trigger.Label>Buscar</NativeTabs.Trigger.Label>
        </View>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="favorites">
        <View style={styles.triggerContent}>
          <NativeTabs.Trigger.Icon sf="heart.fill" md="favorite" />
          <NativeTabs.Trigger.Label>Favoritos</NativeTabs.Trigger.Label>
        </View>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <View style={styles.triggerContent}>
          <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
          <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        </View>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const styles = StyleSheet.create({
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: Spacing.two,
  },
});