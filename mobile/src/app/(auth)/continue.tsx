import { useAuth, useSession } from '@clerk/expo';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Radius, Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

const TASK_MESSAGES: Record<string, string> = {
  'choose-organization': 'Escolha sua organização para continuar.',
  'reset-password': 'É necessário redefinir sua senha para continuar.',
  'setup-mfa': 'Configure a verificação em duas etapas para continuar.',
};

/**
 * Coleta de pendências do fluxo SSO (transfer flow): quando o Clerk não
 * cria a sessão de imediato, mostra qual tarefa da sessão está pendente
 * (`session.currentTask`) e deixa o usuário voltar ao login para completar.
 */
export default function ContinueScreen() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { isSignedIn } = useAuth();
  const { session } = useSession();

  const task = session?.currentTask?.key;

  function resume() {
    if (isSignedIn) {
      router.replace('/(tabs)');
      return;
    }

    router.replace('/(auth)/sign-in');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Falta pouco</Text>
      <Text style={styles.text}>
        {task ? TASK_MESSAGES[task] ?? 'Pendência encontrada na sua conta: continue o acesso.' : 'Retome o login para continuar.'}
      </Text>
      <TouchableOpacity style={styles.button} onPress={resume} role="button" accessibilityLabel="Retomar login">
        <Text style={styles.buttonText}>Continuar</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.four,
      backgroundColor: colors.background,
      gap: Spacing.three,
    },
    title: {
      color: colors.text,
            ...Typography.h2,
    },
    text: {
      color: colors.textSecondary,
      ...Typography.body,
      textAlign: 'center',
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.three - 2,
      paddingHorizontal: Spacing.four,
    },
    buttonText: {
      color: colors.background,
            ...Typography.h5,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
  });
}
