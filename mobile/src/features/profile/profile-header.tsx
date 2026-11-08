import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Overlays, Radius, Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { AuthStatus } from '@/providers/auth-provider';
import type { User } from '@/types/domain';

import { resolveAccountTag } from './account-tag';
import { profileDisplayName } from './profile-display';

const AVATAR_SIZE = Radius.avatar * 2;

interface ProfileHeaderProps {
  state: AuthStatus;
  profile: User | null;
  hasOwnedCompany: boolean | null;
  onLoginPress: () => void;
}

export function ProfileHeader({
  state,
  profile,
  hasOwnedCompany,
  onLoginPress,
}: ProfileHeaderProps) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  if (state !== 'signedIn') {
    return (
      <View style={styles.container}>
        <View style={styles.avatarBox}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color={colors.primary} />
          </View>
          <Text style={styles.userName}>Visitante</Text>
          <Text style={styles.userHint}>Navegando com acesso limitado</Text>
        </View>

        <View style={styles.loginBanner}>
          <Ionicons name="lock-closed" size={18} color={colors.primary} />
          <Text style={styles.loginText}>
            Faça login para salvar favoritos, receber alertas comunitários ou cadastrar seu
            negócio.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={onLoginPress}
            activeOpacity={0.8}
            role="button"
            accessibilityRole="button"
            accessibilityLabel="Entrar ou cadastrar"
          >
            <Ionicons name="log-in-outline" size={18} color={colors.background} />
            <Text style={styles.loginButtonText}>Entrar ou Cadastrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const tag = resolveAccountTag(hasOwnedCompany);
  const nomeExibido = profileDisplayName(profile);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={tag ? `Perfil de ${nomeExibido}, ${tag}` : `Perfil de ${nomeExibido}`}
    >
      <View style={styles.avatarBox}>
        {profile?.imageUrl ? (
          <Image source={{ uri: profile.imageUrl }} style={styles.avatarImagem} />
        ) : (
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color={colors.primary} />
          </View>
        )}
        <Text style={styles.userName}>{nomeExibido}</Text>
        {profile?.email ? <Text style={styles.userHint}>{profile.email}</Text> : null}
        {tag ? (
          <View style={[styles.tag, tag === 'Empresa Parceira' ? styles.tagPartner : styles.tagCitizen]}>
            <Ionicons
              name={tag === 'Empresa Parceira' ? 'business-outline' : 'person-outline'}
              size={12}
              color={tag === 'Empresa Parceira' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tagText,
                tag === 'Empresa Parceira' ? styles.tagTextPartner : styles.tagTextCitizen,
              ]}
            >
              {tag}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      gap: Spacing.three,
      marginBottom: Spacing.four,
    },
    avatarBox: {
      alignItems: 'center',
      gap: Spacing.two,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: Radius.avatar,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImagem: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: Radius.avatar,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    userName: {
      color: colors.text,
            ...Typography.h4,
      fontFamily: FontFamily.heading700,
      fontWeight: FontWeight.bold,
      marginTop: Spacing.half,
    },
    userHint: {
      color: colors.textSecondary,
      ...Typography.body,
      textAlign: 'center',
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.one,
      paddingVertical: Spacing.half,
      paddingHorizontal: Spacing.two,
      borderRadius: Radius.pill,
      borderWidth: 1,
      marginTop: Spacing.half,
    },
    tagPartner: {
      backgroundColor: colors.surface,
      borderColor: colors.primary,
    },
    tagCitizen: {
      backgroundColor: Overlays.neutralTag,
      borderColor: colors.border,
    },
    tagText: {
            ...Typography.caption,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
      textTransform: 'uppercase',
    },
    tagTextPartner: {
      color: colors.primary,
    },
    tagTextCitizen: {
      color: colors.textSecondary,
    },
    loginBanner: {
      backgroundColor: Overlays.amberGlow,
      borderColor: colors.primaryDim,
      borderWidth: 1,
      borderRadius: Radius.card,
      padding: Spacing.three,
      gap: Spacing.two,
    },
    loginText: {
      color: colors.textSoft,
            ...Typography.body,
    },
    loginButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.two,
      backgroundColor: colors.primary,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.three - Spacing.one,
      paddingHorizontal: Spacing.three,
      marginTop: Spacing.one,
    },
    loginButtonText: {
      color: colors.background,
            ...Typography.h5,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
  });
}
