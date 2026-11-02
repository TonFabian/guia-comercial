import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { GuiaColors, Spacing, Type } from '@/constants/theme';

/**
 * Texto exibido quando o dado comercial foi redigido para convidado ou
 * simplesmente não foi informado (`null` vindo do backend).
 */
export const CONTACT_HIDDEN_HINT = 'Entre para ver o contato';

/** Linha padronizada usada no lugar de ações de contato indisponíveis. */
export function ContactHintRow() {
  return (
    <View style={styles.row}>
      <Ionicons name="lock-closed" size={14} color={GuiaColors.primary} />
      <Text style={styles.text}>{CONTACT_HIDDEN_HINT}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  text: {
    color: GuiaColors.textSecondary,
    fontSize: Type.body,
  },
});
