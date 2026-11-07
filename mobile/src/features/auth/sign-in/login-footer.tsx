import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { LoginColors, Typography, FontFamily, FontWeight } from '@/constants/theme';

import type { AuthMode } from './login-labels';
import { loginFooterAction, loginFooterPrompt } from './login-labels';

interface LoginFooterProps {
  mode: AuthMode;
  onSwitchMode: () => void;
}

/**
 * Rodapé da tela de login: alterna entre entrar e criar conta usando os
 * textos derivados do modo atual.
 */
export function LoginFooter({ mode, onSwitchMode }: LoginFooterProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.prompt}>{loginFooterPrompt(mode)}</Text>
      <TouchableOpacity
        onPress={onSwitchMode}
        accessibilityRole="button"
        accessibilityLabel={loginFooterAction(mode)}
      >
        <Text style={styles.action}>{loginFooterAction(mode)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  prompt: {
    color: LoginColors.text,
    ...Typography.body,
  },
  action: {
    color: LoginColors.link,
        ...Typography.body,
    fontFamily: FontFamily.body700,
    fontWeight: FontWeight.bold,
    textDecorationLine: 'underline',
  },
});
