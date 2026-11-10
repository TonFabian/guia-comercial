import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { LoginColors, Typography } from '@/constants/theme';

type FeatherName = ComponentProps<typeof Feather>['name'];

interface LoginFieldProps extends Omit<TextInputProps, 'style'> {
  icon: FeatherName;
  /** Elemento opcional à direita (ex.: botão de mostrar/ocultar senha). */
  right?: ReactNode;
}

/**
 * Campo de texto da tela de login com ícone à esquerda e borda dourada ao
 * receber foco. Altura e raio seguem o padrão visual do formulário.
 */
export function LoginField({ icon, right, ...inputProps }: LoginFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, focused && styles.containerFocused]}>
      <Feather name={icon} size={20} color={LoginColors.muted} />
      <TextInput
        {...inputProps}
        style={styles.input}
        placeholderTextColor={LoginColors.muted}
        onFocus={(event) => {
          setFocused(true);
          inputProps.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          inputProps.onBlur?.(event);
        }}
      />
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    backgroundColor: LoginColors.input,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LoginColors.inputBorder,
    paddingHorizontal: 16,
  },
  containerFocused: {
    borderColor: LoginColors.inputBorderFocused,
  },
  input: {
    flex: 1,
    color: LoginColors.text,
    ...Typography.h5,
    paddingVertical: 0,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
});
