import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAuthState } from '@/providers/auth-provider';
import { useThemeMode } from '@/providers/theme-provider';
import { getMe, updateMe } from '@/services/api';
import { isApiConfigured } from '@/services/http';

const APP_NAME = Constants.expoConfig?.name ?? 'Guia Comercial';
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export function SettingsScreen() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { mode, setMode } = useThemeMode();
  const { state, user } = useAuthState();

  const [notifications, setNotifications] = useState(user?.preferences?.notifications ?? true);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A preferência fica no backend (/me); o espelho do Clerk não a traz.
  useEffect(() => {
    if (state !== 'signedIn') return;

    let cancelled = false;
    (async () => {
      setLoadingPreferences(true);
      try {
        const me = await getMe();
        const preference = me?.preferences?.notifications;
        if (cancelled || preference === undefined) return;
        setNotifications(preference);
      } catch {
        // mantém a preferência exibida
      } finally {
        if (!cancelled) setLoadingPreferences(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state]);

  async function toggleNotifications(value: boolean) {
    setNotifications(value);
    setSaving(true);
    setError(null);

    try {
      const updated = await updateMe({ preferences: { notifications: value } });
      if (!updated && isApiConfigured()) {
        setNotifications(!value);
        setError('Não foi possível salvar a preferência de notificações.');
      }
    } catch {
      setNotifications(!value);
      setError('Não foi possível salvar a preferência de notificações.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Text style={styles.topButtonText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Configurações</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Aparência</Text>
          <View style={styles.card}>
            <View style={styles.themeRow}>
              <ThemeOption
                label="Claro"
                icon="sunny-outline"
                selected={mode === 'light'}
                onPress={() => setMode('light')}
              />
              <ThemeOption
                label="Escuro"
                icon="moon-outline"
                selected={mode === 'dark'}
                onPress={() => setMode('dark')}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Notificações</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="notifications-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Avisos e novidades</Text>
                <Text style={styles.rowHint}>
                  Receba lembretes de empresas e serviços do guia.
                </Text>
              </View>
              {loadingPreferences ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Switch
                  value={notifications}
                  onValueChange={toggleNotifications}
                  disabled={saving || state !== 'signedIn'}
                  accessibilityLabel="Ativar notificações"
                  trackColor={{ true: colors.primary, false: colors.border }}
                />
              )}
            </View>
            {state !== 'signedIn' ? (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.push('/(auth)/sign-in')}
                accessibilityRole="button"
                accessibilityLabel="Entrar para ativar notificações"
              >
                <Text style={styles.linkText}>Entre para ativar</Text>
              </TouchableOpacity>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <Text style={styles.sectionTitle}>Minha empresa</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push('/my-company')}
              accessibilityRole="button"
              accessibilityLabel="Abrir minha empresa"
            >
              <View style={styles.rowIcon}>
                <Ionicons name="business-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Minha empresa</Text>
                <Text style={styles.rowHint}>Horários, descrição e dados do estabelecimento.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Sobre</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>{APP_NAME}</Text>
                <Text style={styles.rowHint}>Versão {APP_VERSION}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

type ThemeOptionProps = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  selected: boolean;
  onPress: () => void;
};

function ThemeOption({ label, icon, selected, onPress }: ThemeOptionProps) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <TouchableOpacity
      style={[styles.themeOption, selected && styles.themeOptionSelected]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`Tema ${label}`}
    >
      <Ionicons
        name={icon}
        size={20}
        color={selected ? colors.background : colors.textSecondary}
      />
      <Text style={[styles.themeOptionText, selected && styles.themeOptionTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    topButton: {
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    topButtonText: {
      color: colors.primary,
      fontSize: Type.base,
      fontWeight: '600',
    },
    title: {
      color: colors.text,
      fontSize: Type.title,
      fontWeight: '700',
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: Spacing.five,
      gap: Spacing.two,
    },
    sectionTitle: {
      color: colors.textSecondary,
      fontSize: Type.small,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginTop: Spacing.three,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.three,
      gap: Spacing.two,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: Radius.iconBox,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    rowBody: {
      flex: 1,
      gap: 2,
    },
    rowLabel: {
      color: colors.text,
      fontSize: Type.subtitle,
      fontWeight: '600',
    },
    rowHint: {
      color: colors.textSecondary,
      fontSize: Type.small,
      lineHeight: 17,
    },
    themeRow: {
      flexDirection: 'row',
      gap: Spacing.two,
    },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: Radius.chip,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeOptionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themeOptionText: {
      color: colors.textSecondary,
      fontSize: Type.base,
      fontWeight: '600',
    },
    themeOptionTextSelected: {
      color: colors.background,
    },
    linkButton: {
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: Radius.chip,
      backgroundColor: colors.surfaceAlt,
    },
    linkText: {
      color: colors.primary,
      fontSize: Type.small,
      fontWeight: '700',
    },
    errorText: {
      color: colors.error,
      fontSize: Type.small,
    },
  });
}
