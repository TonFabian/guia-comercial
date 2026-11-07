import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';

import { Glass, FontWeight } from '@/constants/theme';
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
        <NativeTabs.Trigger.Label>Início</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>Buscar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="favorites">
        <NativeTabs.Trigger.Label>Favoritos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="heart.fill" md="favorite" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}