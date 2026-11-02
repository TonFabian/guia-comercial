import { useAuth, useSession } from '@clerk/expo';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GuiaColors, Radius, Spacing, Type } from '@/constants/theme';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: GuiaColors.background,
    gap: Spacing.three,
  },
  title: {
    color: GuiaColors.text,
    fontSize: Type.headline,
    fontWeight: '700',
  },
  text: {
    color: GuiaColors.textSecondary,
    fontSize: Type.base,
    textAlign: 'center',
  },
  button: {
    backgroundColor: GuiaColors.primary,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.four,
  },
  buttonText: {
    color: GuiaColors.background,
    fontSize: Type.subtitle,
    fontWeight: '700',
  },
});
