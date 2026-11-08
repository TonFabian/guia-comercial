import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

/**
 * Texto exibido quando o dado comercial foi redigido para convidado ou
 * simplesmente não foi informado (`null` vindo do backend).
 */
export const CONTACT_HIDDEN_HINT = 'Entre para ver o contato';

import { useAuthState } from '@/providers/auth-provider';

/** Linha padronizada usada no lugar de ações de contato indisponíveis. */
export function ContactHintRow() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const auth = useAuthState();
  const logado = auth.state === 'signedIn';

  return (
    <View style={styles.row}>
      <Ionicons name={logado ? 'information-circle-outline' : 'lock-closed'} size={14} color={colors.primary} />
      <Text style={styles.text}>
        {logado ? 'Contato não informado' : CONTACT_HIDDEN_HINT}
      </Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingVertical: Spacing.two,
    },
    text: {
      color: colors.textSecondary,
      ...Typography.body,
    },
  });
}
