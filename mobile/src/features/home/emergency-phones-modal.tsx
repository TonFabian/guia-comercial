import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GuiaColors, Overlays, Radius, Spacing, Type } from '@/constants/theme';
import { EMERGENCY_PHONES } from '@/features/home/public-utility';
import { callPhone } from '@/utils/links';

export function EmergencyPhonesModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel="Fechar telefones úteis"
        onPress={onClose}>
        <Pressable
          style={styles.sheet}
          accessibilityRole="none"
          onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="call" size={18} color={GuiaColors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Telefones Úteis</Text>
              <Text style={styles.subtitle}>Emergências de alcance nacional</Text>
            </View>
          </View>

          <View style={styles.list}>
            {EMERGENCY_PHONES.map((phone) => (
              <View key={phone.id} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{phone.label}</Text>
                  <Text style={styles.rowNumber}>{phone.number}</Text>
                </View>
                <TouchableOpacity
                  style={styles.callButton}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Ligar para ${phone.label}, ${phone.number}`}
                  onPress={() => void callPhone(phone.number)}>
                  <Ionicons name="call-outline" size={16} color={GuiaColors.background} />
                  <Text style={styles.callButtonText}>Ligar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <Text style={styles.note}>
            Guarda Municipal e Hospital têm números próprios em cada cidade — consulte a prefeitura
            ou o hospital local.
          </Text>

          <TouchableOpacity
            style={styles.closeButton}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            onPress={onClose}>
            <Text style={styles.closeButtonText}>Fechar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Overlays.blackSoft,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: GuiaColors.surface,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    borderTopWidth: 1,
    borderColor: GuiaColors.border,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radius.tag,
    backgroundColor: GuiaColors.border,
    marginBottom: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.iconBox,
    backgroundColor: Overlays.amberTag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: GuiaColors.text,
    fontSize: Type.section,
    fontWeight: '700',
  },
  subtitle: {
    color: GuiaColors.textSecondary,
    fontSize: Type.body,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: GuiaColors.surfaceAlt,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rowText: {
    gap: 2,
  },
  rowLabel: {
    color: GuiaColors.text,
    fontSize: Type.base,
    fontWeight: '600',
  },
  rowNumber: {
    color: GuiaColors.primary,
    fontSize: Type.subtitle,
    fontWeight: '800',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GuiaColors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  callButtonText: {
    color: GuiaColors.background,
    fontSize: Type.body,
    fontWeight: '700',
  },
  note: {
    color: GuiaColors.textSecondary,
    fontSize: Type.small,
    lineHeight: 16,
  },
  closeButton: {
    alignSelf: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    paddingVertical: 10,
    paddingHorizontal: Spacing.four,
  },
  closeButtonText: {
    color: GuiaColors.text,
    fontSize: Type.body,
    fontWeight: '600',
  },
});
