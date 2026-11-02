import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAuthState } from '@/providers/auth-provider';
import { useThemeMode } from '@/providers/theme-provider';

const MENU = [
  { id: '1', label: 'Meus dados', icon: 'person-outline' as const },
  { id: '2', label: 'Minha empresa', icon: 'business-outline' as const },
  { id: '3', label: 'Configurações', icon: 'settings-outline' as const },
  { id: '4', label: 'Sair', icon: 'log-out-outline' as const },
];

export default function ProfileScreen() {
  const { state, user, exitGuest, signOut } = useAuthState();
  const { mode, toggle } = useThemeMode();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const handleMenuPress = (item: (typeof MENU)[0]) => {
    if (item.id === '1') {
      if (state === 'signedIn') {
        Alert.alert('Meus dados', 'Em breve');
        return;
      }

      router.push('/(auth)/sign-in');
      return;
    }
    if (item.id === '4') {
      handleSignOut();
      return;
    }
    Alert.alert(item.label, 'Em breve');
  };

  /**
   * Sair encerra a sessão do Clerk (ou o modo convidado). O guard do layout
   * das abas leva ao sign-in quando o estado vira `signedOut`.
   */
  function handleSignOut() {
    if (state === 'guest') {
      exitGuest();
      router.replace('/(auth)/sign-in');
      return;
    }
    if (state === 'signedIn') {
      void signOut();
    }
  }

  const handleLoginPress = () => {
    if (state !== 'signedIn') {
      router.push('/(auth)/sign-in');
    }
  };

  const nomeExibido = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : 'Visitante';

  return (
    <View style={StyleSheet.flatten([styles.root, { backgroundColor: colors.background }])}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text style={[styles.title, { color: colors.text }]}>Perfil</Text>
        <TouchableOpacity
          style={styles.avatarBox}
          activeOpacity={state === 'signedIn' ? 1 : 0.7}
          onPress={handleLoginPress}
          accessibilityLabel={state === 'signedIn' ? `Perfil de ${nomeExibido}` : 'Entrar na conta'}
        >
          {user?.imageUrl ? (
            <Image source={{ uri: user.imageUrl }} style={styles.avatarImagem} />
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="person" size={36} color={colors.primary} />
            </View>
          )}
          <Text style={styles.userName}>{nomeExibido}</Text>
          <Text style={styles.userHint}>
            {state === 'guest'
              ? 'Convidado — entre para ver contatos e cupons'
              : (user?.email ?? 'Faça login para salvar favoritos')}
          </Text>
        </TouchableOpacity>
        <View style={styles.menu}>
          {MENU.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => handleMenuPress(item)}
            >
              <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.themeToggle} onPress={toggle}>
          <Ionicons
            name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
            size={20}
            color={colors.text}
          />
          <Text style={styles.themeToggleText}>Tema: {mode === 'dark' ? 'Escuro' : 'Claro'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
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
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 20,
    },
    avatarBox: {
      alignItems: 'center',
      gap: 8,
      marginBottom: 28,
    },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImagem: {
      width: 84,
      height: 84,
      borderRadius: 42,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    userName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      marginTop: 6,
    },
    userHint: {
      color: colors.textSecondary,
      fontSize: 13,
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
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 15,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    menuLabel: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
    },
    themeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 20,
      padding: 14,
      borderRadius: Radius.card,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeToggleText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
