import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';

import { Glass, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useThemeMode } from '@/providers/theme-provider';

/**
 * Tab bar nativa (iOS/Android). Icon e Label são FILHOS DIRETOS do Trigger:
 * a API nativa define o layout (ícone em cima, label embaixo). Nada de
 * <View> embrulhando-os — um wrapper quebra o reconhecimento dos filhos
 * pelo side-effect nativo e os ícones param de renderizar no Android.
 * No Android o `md` exige Material Symbols outlined (glyphs brancos).
 */
export default function AppTabs() {
  const colors = useThemeColors();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  return (
    <NativeTabs
      backgroundColor={Platform.select({
        ios: isDark ? Glass.tabBar : 'rgba(255,255,255,0.72)',
        default: colors.background,
      })}
      tintColor={colors.primary}
      iconColor={{ default: colors.textSecondary, selected: colors.primary }}
      blurEffect={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      disableTransparentOnScrollEdge
      disableIndicator
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.primary, fontWeight: FontWeight.semibold },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        <NativeTabs.Trigger.Label>Início</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>Buscar</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="favorites">
        <NativeTabs.Trigger.Icon sf="heart.fill" md="favorite" />
        <NativeTabs.Trigger.Label>Favoritos</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}