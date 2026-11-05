import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAuthState } from '@/providers/auth-provider';
import { useThemeMode } from '@/providers/theme-provider';

import { ProfileHeader } from './profile-header';
import { buildMenu } from './profile-menu';
import type { MenuItemId } from './profile-menu';
import { SignOutModal } from './sign-out-modal';
import { useProfile } from './use-profile';

export function ProfileScreen() {
  const { state, signOutToGuest } = useAuthState();
  const { profile, hasOwnedCompany, loading } = useProfile();
  const { mode, toggle } = useThemeMode();
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [showSignOut, setShowSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (state === 'loading' || state === 'signedOut') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  function handleMenuPress(id: MenuItemId) {
    switch (id) {
      case 'meus-dados':
        router.push(state === 'signedIn' ? '/user-profile' : '/(auth)/sign-in');
        return;
      case 'minha-empresa':
        router.push(state === 'signedIn' ? '/my-company' : '/(auth)/sign-in');
        return;
      case 'configuracoes':
        router.push('/settings');
        return;
      case 'sair':
        setShowSignOut(true);
        return;
    }
  }

  async function confirmSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    try {
      await signOutToGuest();
      setShowSignOut(false);
    } catch {
      Alert.alert('Sair', 'Não foi possível sair. Tente novamente.');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Perfil</Text>

          <ProfileHeader
            state={state}
            profile={profile}
            hasOwnedCompany={hasOwnedCompany}
            onLoginPress={() => router.push('/(auth)/sign-in')}
          />

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : null}

          <View style={styles.menu}>
            {buildMenu(state).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => handleMenuPress(item.id)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.themeToggle}
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={`Tema atual: ${mode === 'dark' ? 'escuro' : 'claro'}. Alternar tema`}
          >
            <Ionicons
              name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
              size={20}
              color={colors.text}
            />
            <Text style={styles.themeToggleText}>Tema: {mode === 'dark' ? 'Escuro' : 'Claro'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <SignOutModal
        visible={showSignOut}
        signingOut={signingOut}
        onCancel={() => setShowSignOut(false)}
        onConfirm={() => void confirmSignOut()}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
    },
    content: {
      paddingHorizontal: Spacing.three,
      paddingTop: Spacing.three - Spacing.one,
      paddingBottom: Spacing.five,
    },
    title: {
      color: colors.text,
      fontSize: Type.headline,
      fontWeight: '700',
      marginBottom: Spacing.three,
    },
    loading: {
      marginBottom: Spacing.three,
    },
    menu: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.three - Spacing.one,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.three - Spacing.half,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    menuLabel: {
      flex: 1,
      color: colors.text,
      fontSize: Type.subtitle,
    },
    themeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two + Spacing.half,
      marginTop: Spacing.three + Spacing.one,
      padding: Spacing.three - Spacing.half,
      borderRadius: Radius.card,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeToggleText: {
      color: colors.text,
      fontSize: Type.subtitle,
      fontWeight: '600',
    },
  });
}
