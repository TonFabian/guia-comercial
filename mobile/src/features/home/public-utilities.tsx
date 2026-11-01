import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Glass,
  Overlays,
  Radius,
  Spacing,
  Type,
  UtilityColors,
} from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { MOCK_PUBLIC_UTILITIES, type PublicUtility } from '@/data/public-utilities';
import { callPhone } from '@/utils/links';
import { SectionHeader } from './section-header';

export function PublicUtilities({
  utilities = MOCK_PUBLIC_UTILITIES,
}: {
  utilities?: PublicUtility[];
}) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [selectedUtility, setSelectedUtility] = useState<PublicUtility | null>(null);
  const selectedPhone = selectedUtility?.phone ?? null;

  function handleUtilityPress(utility: PublicUtility) {
    void Haptics.selectionAsync().catch(() => undefined);

    if (utility.action === 'call' && utility.phone) {
      void callPhone(utility.phone);
      return;
    }

    setSelectedUtility(utility);
  }

  function closeDetails() {
    setSelectedUtility(null);
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Telefones Úteis & Serviços" />
      <View style={styles.grid}>
        {utilities.map((utility) => {
          const isCallAction = utility.action === 'call' && Boolean(utility.phone);
          const badgeTextColor =
            utility.accent === UtilityColors.sanitation
              ? colors.background
              : colors.text;

          return (
            <Pressable
              key={utility.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => handleUtilityPress(utility)}
              accessibilityRole="button"
              accessibilityLabel={
                isCallAction
                  ? `Ligar para ${utility.name} no número ${utility.phone}`
                  : `Ver detalhes de ${utility.name}`
              }>
              <View style={styles.cardTop}>
                <View style={[styles.iconTag, { backgroundColor: `${utility.accent}22` }]}>
                  <MaterialCommunityIcons
                    name={utility.icon}
                    size={22}
                    color={utility.accent}
                  />
                </View>

                {isCallAction ? (
                  <View style={[styles.phoneBadge, { backgroundColor: utility.accent }]}>
                    <Text style={[styles.phoneBadgeText, { color: badgeTextColor }]}>
                      {utility.phone}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.detailsBadge}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={14}
                      color={colors.textSecondary}
                    />
                  </View>
                )}
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {utility.name}
                </Text>
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {utility.description}
                </Text>
              </View>

              <View style={styles.cardAction}>
                <Text style={styles.cardActionText}>
                  {isCallAction ? 'Toque para ligar' : 'Ver detalhes'}
                </Text>
                <MaterialCommunityIcons
                  name={isCallAction ? 'phone' : 'chevron-right'}
                  size={14}
                  color={colors.primary}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      <Modal
        visible={selectedUtility !== null}
        transparent
        animationType="fade"
        onRequestClose={closeDetails}>
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeDetails}
            accessibilityRole="button"
            accessibilityLabel="Fechar detalhes"
          />

          {selectedUtility ? (
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View
                  style={[
                    styles.modalIcon,
                    { backgroundColor: `${selectedUtility.accent}22` },
                  ]}>
                  <MaterialCommunityIcons
                    name={selectedUtility.icon}
                    size={28}
                    color={selectedUtility.accent}
                  />
                </View>
                <Pressable
                  style={styles.modalCloseIcon}
                  onPress={closeDetails}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar">
                  <MaterialCommunityIcons
                    name="close"
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalTitle}>{selectedUtility.name}</Text>
                <Text style={styles.modalDescription}>{selectedUtility.description}</Text>
              </View>

              {selectedUtility.details?.length ? (
                <View style={styles.modalDetails}>
                  {selectedUtility.details.map((detail) => (
                    <View key={detail} style={styles.modalDetailRow}>
                      <View
                        style={[
                          styles.modalDetailDot,
                          { backgroundColor: selectedUtility.accent },
                        ]}
                      />
                      <Text style={styles.modalDetailText}>{detail}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {selectedPhone ? (
                <Pressable
                  style={styles.modalCallButton}
                  onPress={() => void callPhone(selectedPhone)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ligar para ${selectedUtility.name}`}>
                  <MaterialCommunityIcons
                    name="phone"
                    size={18}
                    color={colors.background}
                  />
                  <Text style={styles.modalCallText}>Ligar agora</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.modalDismissButton}
                  onPress={closeDetails}
                  accessibilityRole="button">
                  <Text style={styles.modalDismissText}>Entendi</Text>
                </Pressable>
              )}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    section: {
      marginBottom: Spacing.four,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: Spacing.two + Spacing.one,
      paddingHorizontal: Spacing.three,
    },
    card: {
      width: '48%',
      minHeight: 158,
      justifyContent: 'space-between',
      gap: Spacing.two,
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    cardPressed: {
      opacity: 0.86,
      borderColor: Overlays.amberGlow,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconTag: {
      width: 40,
      height: 40,
      borderRadius: Radius.iconBox,
      alignItems: 'center',
      justifyContent: 'center',
    },
    phoneBadge: {
      borderRadius: Radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    phoneBadgeText: {
      fontSize: Type.small,
      fontWeight: '800',
    },
    detailsBadge: {
      width: 28,
      height: 28,
      borderRadius: Radius.iconBox,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    cardBody: {
      gap: Spacing.one,
    },
    cardTitle: {
      color: colors.text,
      fontSize: Type.base,
      fontWeight: '700',
      lineHeight: 18,
    },
    cardDescription: {
      color: colors.textSecondary,
      fontSize: Type.small,
      lineHeight: 16,
    },
    cardAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.one,
    },
    cardActionText: {
      color: colors.primary,
      fontSize: Type.small,
      fontWeight: '700',
    },
    modalOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Overlays.scrim,
      padding: Spacing.four,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      gap: Spacing.three,
      backgroundColor: colors.surface,
      borderRadius: Radius.cardLarge,
      borderWidth: 1,
      borderColor: Glass.border,
      padding: Spacing.four,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalIcon: {
      width: 52,
      height: 52,
      borderRadius: Radius.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCloseIcon: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radius.pill,
    },
    modalBody: {
      gap: Spacing.one,
    },
    modalTitle: {
      color: colors.text,
      fontSize: Type.title,
      fontWeight: '700',
    },
    modalDescription: {
      color: colors.textSecondary,
      fontSize: Type.base,
    },
    modalDetails: {
      gap: Spacing.two,
    },
    modalDetailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.two,
    },
    modalDetailDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 6,
    },
    modalDetailText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: Type.body,
      lineHeight: 19,
    },
    modalCallButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.two,
      backgroundColor: colors.primary,
      borderRadius: Radius.pill,
      paddingVertical: 14,
    },
    modalCallText: {
      color: colors.background,
      fontSize: Type.base,
      fontWeight: '700',
    },
    modalDismissButton: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
    },
    modalDismissText: {
      color: colors.text,
      fontSize: Type.base,
      fontWeight: '700',
    },
  });
}