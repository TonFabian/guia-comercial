import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { GuiaColors, Overlays, Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface SignOutModalProps {
  visible: boolean;
  signingOut: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SignOutModal({ visible, signingOut, onCancel, onConfirm }: SignOutModalProps) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  function handleCancel() {
    if (!signingOut) onCancel();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancelar saída"
        />

        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title}>Sair da conta?</Text>
          <Text style={styles.message}>Deseja realmente sair da sua conta?</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={signingOut}
              accessibilityRole="button"
              accessibilityLabel="Cancelar saída">
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, signingOut && styles.confirmButtonDisabled]}
              onPress={onConfirm}
              disabled={signingOut}
              accessibilityRole="button"
              accessibilityLabel="Confirmar saída"
              accessibilityState={{ busy: signingOut, disabled: signingOut }}>
              {signingOut ? (
                <ActivityIndicator color={GuiaColors.text} size="small" />
              ) : (
                <Text style={styles.confirmText}>Sair</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: Overlays.scrim,
      justifyContent: 'center',
      padding: Spacing.four,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.four,
      gap: Spacing.three,
    },
    title: {
      color: colors.text,
      fontSize: Type.title,
      fontWeight: '700',
    },
    message: {
      color: colors.textSecondary,
      fontSize: Type.base,
      lineHeight: 20,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Spacing.two,
      marginTop: Spacing.two,
    },
    cancelButton: {
      minWidth: 96,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.two + Spacing.half,
      paddingHorizontal: Spacing.three,
      borderRadius: Radius.chip,
      backgroundColor: colors.surfaceAlt,
    },
    cancelText: {
      color: colors.text,
      fontSize: Type.base,
      fontWeight: '600',
    },
    confirmButton: {
      minWidth: 96,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.two + Spacing.half,
      paddingHorizontal: Spacing.three,
      borderRadius: Radius.chip,
      backgroundColor: colors.error,
    },
    confirmButtonDisabled: {
      opacity: 0.6,
    },
    confirmText: {
      color: GuiaColors.text,
      fontSize: Type.base,
      fontWeight: '700',
    },
  });
}
