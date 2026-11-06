import Feather from '@expo/vector-icons/Feather';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { LoginColors, Type } from '@/constants/theme';

interface RememberRowProps {
  remember: boolean;
  onToggleRemember: () => void;
}

/**
 * Linha de opções do login: checkbox "Lembrar-me" e link de recuperação de
 * senha. O Clerk já persiste a sessão, então "Lembrar-me" é apenas visual.
 */
export function RememberRow({ remember, onToggleRemember }: RememberRowProps) {
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
            <Feather name="check" size={12} color={LoginColors.primaryText} />
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
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
    borderColor: LoginColors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: LoginColors.link,
    borderColor: LoginColors.link,
  },
  rememberText: {
    color: LoginColors.text,
    fontSize: Type.base,
  },
  forgot: {
    color: LoginColors.link,
    fontSize: Type.base,
    fontWeight: '600',
  },
});
