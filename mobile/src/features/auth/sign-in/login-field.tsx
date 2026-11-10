import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { Typography } from '@/constants/theme';
import { useLoginColors } from '@/features/auth/use-login-theme';

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
  const colors = useLoginColors();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, focused && styles.containerFocused]}>
      <Feather name={icon} size={20} color={colors.muted} />
      <TextInput
        {...inputProps}
        style={styles.input}
        placeholderTextColor={colors.muted}
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

function makeStyles(colors: ReturnType<typeof useLoginColors>) {
  return StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    backgroundColor: colors.input,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 16,
  },
  containerFocused: {
    borderColor: colors.inputBorderFocused,
  },
  input: {
    flex: 1,
    color: colors.text,
    ...Typography.h5,
    paddingVertical: 0,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  });
}
