import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAuthState } from '@/providers/auth-provider';
import { getMe, updateMe } from '@/services/api';
import type { User } from '@/types/domain';
import { formatPhone, onlyDigits } from '@/utils/phone';

export default function UserProfileScreen() {
  const { state, user, updateProfileName } = useAuthState();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(onlyDigits(user?.phone ?? ''));
  const [phoneDisplay, setPhoneDisplay] = useState(formatPhone(user?.phone ?? ''));
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood ?? '');
  const [loadedClerkId, setLoadedClerkId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loading = state === 'signedIn' && (!user?.clerkId || loadedClerkId !== user.clerkId);

  useEffect(() => {
    if (state === 'guest' || state === 'signedOut') {
      router.replace('/(auth)/sign-in');
    }
  }, [state]);

  // O espelho `/me` é a fonte dos campos editáveis; o Clerk cobre o resto.
  useEffect(() => {
    if (state !== 'signedIn' || !user?.clerkId) return;

    const clerkId = user.clerkId;
    let cancelled = false;

    void getMe()
      .then((me) => {
        if (cancelled) return;
        const origem = me ?? user;
        setFirstName(origem?.firstName ?? '');
        setLastName(origem?.lastName ?? '');
        setEmail(user.email || origem?.email || '');
        setPhone(onlyDigits(origem?.phone ?? ''));
        setPhoneDisplay(formatPhone(origem?.phone ?? ''));
        setNeighborhood(origem?.neighborhood ?? '');
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadedClerkId(clerkId);
      });

    return () => {
      cancelled = true;
    };
  }, [state, user]);

  async function save() {
    if (state !== 'signedIn' || saving) return;

    setSaving(true);
    const firstNameValue = firstName.trim();
    const lastNameValue = lastName.trim();

    try {
      const payload: Partial<User> = {
        phone: onlyDigits(phone),
        neighborhood: neighborhood.trim(),
      };
      if (firstNameValue) payload.firstName = firstNameValue;
      if (lastNameValue) payload.lastName = lastNameValue;

      const updated = await updateMe(payload);
      if (!updated) {
        Alert.alert('Meus dados', 'Não foi possível salvar. Tente novamente.');
        return;
      }

      setFirstName(updated.firstName ?? firstNameValue);
      setLastName(updated.lastName ?? lastNameValue);
      setPhone(onlyDigits(updated.phone ?? phone));
      setPhoneDisplay(formatPhone(updated.phone ?? phone));
      setNeighborhood(updated.neighborhood ?? neighborhood.trim());

      await updateProfileName(firstNameValue, lastNameValue);
      Alert.alert('Meus dados', 'Dados atualizados com sucesso.');
    } catch {
      Alert.alert('Meus dados', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (state !== 'signedIn' || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
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
          <Text style={styles.title}>Meus dados</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Nome"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            textContentType="givenName"
            accessibilityLabel="Nome"
          />

          <Text style={styles.label}>Sobrenome</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Sobrenome"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            textContentType="familyName"
            accessibilityLabel="Sobrenome"
          />

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={[styles.input, styles.inputReadonly]}
            value={email}
            editable={false}
            accessibilityLabel="E-mail (somente leitura)"
          />
          <Text style={styles.helper}>O e-mail é gerenciado pela sua conta.</Text>

          <Text style={styles.label}>Telefone / WhatsApp</Text>
          <TextInput
            style={styles.input}
            value={phoneDisplay}
            onChangeText={(raw) => {
              const clean = onlyDigits(raw);
              setPhone(clean);
              setPhoneDisplay(formatPhone(clean));
            }}
            placeholder="(85) 99999-0000"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            accessibilityLabel="Telefone ou WhatsApp"
          />

          <Text style={styles.label}>Bairro de residência</Text>
          <TextInput
            style={styles.input}
            value={neighborhood}
            onChangeText={setNeighborhood}
            placeholder="Ex.: Centro"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            textContentType="sublocality"
            accessibilityLabel="Bairro de residência"
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={save}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Salvar alterações"
            accessibilityState={{ busy: saving }}
          >
            {saving ? <ActivityIndicator color={colors.background} size="small" /> : null}
            <Text style={styles.saveButtonText}>
              {saving ? 'Salvando…' : 'Salvar Alterações'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.three - Spacing.one,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.three - Spacing.one,
    },
    topButton: {
      paddingVertical: Spacing.one,
      paddingHorizontal: Spacing.two + Spacing.half,
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
    },
    content: {
      paddingHorizontal: Spacing.three,
      paddingBottom: Spacing.five,
      gap: Spacing.two,
    },
    label: {
      color: colors.textSecondary,
            ...Typography.caption,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
      textTransform: 'uppercase',
      marginTop: Spacing.two,
    },
    input: {
      backgroundColor: colors.surface,
      color: colors.text,
      borderRadius: Radius.chip,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.three - Spacing.one,
      ...Typography.body,
    },
    inputReadonly: {
      color: colors.textSecondary,
      backgroundColor: colors.surfaceAlt,
    },
    helper: {
      color: colors.textSecondary,
      ...Typography.caption,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.two,
      backgroundColor: colors.primary,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.three - Spacing.half,
      marginTop: Spacing.four,
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveButtonText: {
      color: colors.background,
            ...Typography.h5,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
  });
}