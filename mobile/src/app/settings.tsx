import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

import { SUPPORT_WHATSAPP_MESSAGE, SUPPORT_WHATSAPP_PHONE, TERMS_URL } from '@/constants/support';
import { Radius, Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { TopBackButton } from '@/components/top-back-button';
import { useAuthState } from '@/providers/auth-provider';
import { useThemeMode } from '@/providers/theme-provider';
import { getMe, updateMe } from '@/services/api';
import { isApiConfigured } from '@/services/http';
import { openExternalUrl, openWhatsApp } from '@/utils/links';

const APP_NAME = Constants.expoConfig?.name ?? 'Guia Comercial';
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { mode, setMode } = useThemeMode();
  const { state, user } = useAuthState();

  const [publicUtilityAlerts, setPublicUtilityAlerts] = useState(
    user?.preferences?.publicUtilityAlerts ?? true,
  );
  const [jobPostingAlerts, setJobPostingAlerts] = useState(
    user?.preferences?.jobPostingAlerts ?? true,
  );
  const [loadingPreferences, setLoadingPreferences] = useState(state === 'signedIn');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const legacyNotifications = useRef<boolean | undefined>(undefined);

  // As preferências ficam no backend (/me); o espelho do Clerk não as traz.
  useEffect(() => {
    if (state !== 'signedIn') return;

    let cancelled = false;
    (async () => {
      setLoadingPreferences(true);
      try {
        const me = await getMe();
        if (cancelled) return;

        const publicUtility = me?.preferences?.publicUtilityAlerts;
        const jobPosting = me?.preferences?.jobPostingAlerts;
        legacyNotifications.current = me?.preferences?.notifications;
        if (publicUtility !== undefined) setPublicUtilityAlerts(publicUtility);
        if (jobPosting !== undefined) setJobPostingAlerts(jobPosting);
      } catch {
        // mantém os defaults exibidos
      } finally {
        if (!cancelled) setLoadingPreferences(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state]);

  async function savePreferences(next: {
    publicUtilityAlerts: boolean;
    jobPostingAlerts: boolean;
  }): Promise<boolean> {
    setSaving(true);
    setError(null);

    try {
      const preferences =
        legacyNotifications.current === undefined
          ? next
          : { ...next, notifications: legacyNotifications.current };
      const updated = await updateMe({ preferences });
      if (!updated && isApiConfigured()) {
        setError('Não foi possível salvar a preferência de notificações.');
        return false;
      }
      return true;
    } catch {
      setError('Não foi possível salvar a preferência de notificações.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function togglePreference(
    key: 'publicUtilityAlerts' | 'jobPostingAlerts',
    value: boolean,
  ) {
    const anteriorPublicUtility = publicUtilityAlerts;
    const anteriorJobPosting = jobPostingAlerts;
    const next = {
      publicUtilityAlerts: key === 'publicUtilityAlerts' ? value : publicUtilityAlerts,
      jobPostingAlerts: key === 'jobPostingAlerts' ? value : jobPostingAlerts,
    };

    if (key === 'publicUtilityAlerts') setPublicUtilityAlerts(value);
    else setJobPostingAlerts(value);

    if (!(await savePreferences(next))) {
      setPublicUtilityAlerts(anteriorPublicUtility);
      setJobPostingAlerts(anteriorJobPosting);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.topBar}>
          <TopBackButton onPress={() => router.back()} />
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
            {loadingPreferences ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.rowHint}>Carregando preferências…</Text>
              </View>
            ) : (
              <>
                <View style={styles.row}>
                  <View style={styles.rowIcon}>
                    <Ionicons name="megaphone-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowLabel}>Avisos de utilidade pública</Text>
                    <Text style={styles.rowHint}>Saúde, coleta de lixo e comunicados.</Text>
                  </View>
                  <Switch
                    value={publicUtilityAlerts}
                    onValueChange={(value) => void togglePreference('publicUtilityAlerts', value)}
                    disabled={saving || state !== 'signedIn'}
                    accessibilityLabel="Ativar avisos de utilidade pública"
                    trackColor={{ true: colors.primary, false: colors.border }}
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <View style={styles.rowIcon}>
                    <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowLabel}>Novas vagas de emprego</Text>
                    <Text style={styles.rowHint}>Receba vagas publicadas no guia.</Text>
                  </View>
                  <Switch
                    value={jobPostingAlerts}
                    onValueChange={(value) => void togglePreference('jobPostingAlerts', value)}
                    disabled={saving || state !== 'signedIn'}
                    accessibilityLabel="Ativar notificações de novas vagas"
                    trackColor={{ true: colors.primary, false: colors.border }}
                  />
                </View>
              </>
            )}
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

          <Text style={styles.sectionTitle}>Suporte & Termos</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                void openWhatsApp(SUPPORT_WHATSAPP_PHONE, SUPPORT_WHATSAPP_MESSAGE)
              }
              accessibilityRole="button"
              accessibilityLabel="Ajuda e suporte via WhatsApp"
            >
              <View style={styles.rowIcon}>
                <Ionicons name="logo-whatsapp" size={20} color={colors.whatsapp} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Ajuda & Suporte via WhatsApp</Text>
                <Text style={styles.rowHint}>Fale com a equipe do Guia Comercial.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                void openExternalUrl(TERMS_URL, 'Termos de Uso e Privacidade')
              }
              accessibilityRole="button"
              accessibilityLabel="Abrir termos de uso e privacidade"
            >
              <View style={styles.rowIcon}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Termos de Uso e Privacidade</Text>
                <Text style={styles.rowHint}>Consulte as regras e a política do app.</Text>
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
                <Text style={styles.rowHint}>Versão v{APP_VERSION}</Text>
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
            ...Typography.body,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
    },
    title: {
      color: colors.text,
            ...Typography.h4,
      fontFamily: FontFamily.heading700,
      fontWeight: FontWeight.bold,
      position: 'absolute', left: 0, right: 0, textAlign: 'center',
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: Spacing.five,
      gap: Spacing.two,
    },
    sectionTitle: {
      color: colors.textSecondary,
            ...Typography.caption,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
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
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingVertical: Spacing.two,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
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
            ...Typography.h5,
    },
    rowHint: {
      color: colors.textSecondary,
            ...Typography.caption,
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
            ...Typography.body,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
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
            ...Typography.caption,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    errorText: {
      color: colors.error,
      ...Typography.caption,
    },
  });
}