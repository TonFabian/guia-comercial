import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useThemeMode } from '@/providers/theme-provider';
import { useAuthState } from '@/providers/auth-provider';
import { useUser } from '@clerk/expo';
import { formatPhone, onlyDigits } from '@/utils/phone';

export { formatPhone, onlyDigits };

const MENU = [
  { id: '1', label: 'Meus dados', icon: 'person-outline' as const },
  { id: '2', label: 'Minha empresa', icon: 'business-outline' as const },
  { id: '3', label: 'Configurações', icon: 'settings-outline' as const },
  { id: '4', label: 'Sair', icon: 'log-out-outline' as const },
];

export default function ProfileScreen() {
  const { state, user, exitGuest, signOut } = useAuthState();
  const { user: clerkUser } = useUser();
  const { mode, toggle } = useThemeMode();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(onlyDigits(user?.phone ?? ''));
  const [phoneDisplay, setPhoneDisplay] = useState(formatPhone(user?.phone ?? ''));
  const [imageUrl, setImageUrl] = useState(user?.imageUrl ?? '');
  const [saving, setSaving] = useState(false);

  const handleMenuPress = (item: (typeof MENU)[0]) => {
    if (item.id === '1') {
      if (state !== 'signedIn') {
        router.push('/(auth)/sign-in');
        return;
      }
      setFirstName(user?.firstName ?? '');
      setLastName(user?.lastName ?? '');
      setPhone(onlyDigits(user?.phone ?? ''));
      setPhoneDisplay(formatPhone(user?.phone ?? ''));
      setImageUrl(user?.imageUrl ?? '');
      setEditing(true);
      return;
    }
    if (item.id === '4') {
      handleSignOut();
      return;
    }
    Alert.alert(item.label, 'Em breve');
  };

  async function saveProfile() {
    if (state !== 'signedIn') return;
    setSaving(true);
    try {
  const { updateMe } = await import('@/services/api');
  await updateMe({ firstName, lastName, phone, imageUrl });
      if (clerkUser) {
        await clerkUser.update({ firstName, lastName });
      }
      Alert.alert('Perfil', 'Dados atualizados com sucesso.');
      setEditing(false);
    } catch {
      Alert.alert('Perfil', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

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

      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Meus dados</Text>
            <TextInput style={styles.modalInput} placeholder="Nome" value={firstName} onChangeText={setFirstName} />
            <TextInput style={styles.modalInput} placeholder="Sobrenome" value={lastName} onChangeText={setLastName} />
            <TextInput
              style={styles.modalInput}
              placeholder="Telefone"
              value={phoneDisplay}
              onChangeText={(raw) => {
                const clean = onlyDigits(raw);
                setPhone(clean);
                setPhoneDisplay(formatPhone(clean));
              }}
              keyboardType="phone-pad"
            />
            <TextInput style={styles.modalInput} placeholder="URL da foto" value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setEditing(false)}>
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={saveProfile} disabled={saving}>
                <Text style={[styles.modalButtonText, styles.modalButtonPrimaryText]}>{saving ? 'Salvando…' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      gap: 12,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    modalInput: {
      backgroundColor: colors.background,
      color: colors.text,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 8,
    },
    modalButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    modalButtonText: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: '600',
    },
    modalButtonPrimary: {
      backgroundColor: colors.primary,
    },
    modalButtonPrimaryText: {
      color: colors.background,
    },
  });
}
