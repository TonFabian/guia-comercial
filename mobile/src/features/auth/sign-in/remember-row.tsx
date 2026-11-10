import Feather from '@expo/vector-icons/Feather';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useLoginColors } from '@/features/auth/use-login-theme';

interface RememberRowProps {
  remember: boolean;
  onToggleRemember: () => void;
}

/**
 * Linha de opções do login: checkbox "Lembrar-me" e link de recuperação de
 * senha. O Clerk já persiste a sessão, então "Lembrar-me" é apenas visual.
 */
export function RememberRow({ remember, onToggleRemember }: RememberRowProps) {
  const colors = useLoginColors();
  const styles = makeStyles(colors);
  function forgotPassword() {
    Alert.alert(
      'Recuperar senha',
      'A recuperação de senha estará disponível em breve.',
    );
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.rememberButton}
        onPress={onToggleRemember}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: remember }}
        accessibilityLabel="Lembrar-me"
      >
        <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
          {remember ? (
            <Feather name="check" size={12} color={colors.primaryText} />
          ) : null}
        </View>
        <Text style={styles.rememberText}>Lembrar-me</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={forgotPassword}
        accessibilityRole="link"
        accessibilityLabel="Esqueceu sua senha?"
      >
        <Text style={styles.forgot}>Esqueceu sua senha?</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useLoginColors>) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 12,
  },
  rememberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.link,
    borderColor: colors.link,
  },
  rememberText: {
    color: colors.text,
    ...Typography.body,
  },
  forgot: {
    color: colors.link,
        ...Typography.body,
    fontFamily: FontFamily.body600,
    fontWeight: FontWeight.semibold,
  },
});
}
