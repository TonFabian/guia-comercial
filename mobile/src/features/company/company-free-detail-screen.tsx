import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ButtonGradients,
  ButtonTextColors,
  CardShadow,
  FontFamily,
  FontWeight,
  Overlays,
  Radius,
  Spacing,
  Type,
  Typography,
} from '@/constants/theme';
import { useFavorites } from '@/features/favorites/favorites-provider';
import { trackView, trackWhatsappClick } from '@/features/analytics/track';
import { ContactHintRow } from '@/features/home/contact-hidden-hint';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useThemeMode } from '@/providers/theme-provider';
import type { Company } from '@/types/domain';
import { callPhone, openWhatsApp } from '@/utils/links';

import type { CompanyFreeView } from './company-free-view';
import { buildCompanyFreeView } from './company-free-view';

const IMAGE_ASPECT_RATIO = 16 / 9;
const IMAGE_MIN_HEIGHT = 200;
const IMAGE_MAX_HEIGHT = 320;
const ICON_BUTTON_SIZE = 44;
const WHATSAPP_MESSAGE =
  'Olá, vi sua empresa no aplicativo *Guia de Castelo do Piauí* e gostaria de mais informações!';

function statusColor(
  tone: CompanyFreeView['status']['tone'],
  colors: ReturnType<typeof useThemeColors>,
): string {
  if (tone === 'success') return colors.success;
  if (tone === 'error') return colors.error;
  return colors.textSecondary;
}

export function CompanyFreeDetailScreen({ company }: { company: Company }) {
  const colors = useThemeColors();
  const { mode } = useThemeMode();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavorites();
  const view = buildCompanyFreeView(company, new Date());
  const favorite = isFavorite(company._id);

  useEffect(() => {
    if (company?._id) trackView(company._id);
  }, [company?._id]);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }

  function handleToggleFavorite() {
    toggleFavorite(company);
    void Haptics.selectionAsync().catch(() => undefined);
  }

  return (
    <View style={styles.root}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Spacing.six * 2 },
          ]}
        >
          <View style={styles.imageWrapper}>
            {view.coverUrl ? (
              <Image
                source={{ uri: view.coverUrl }}
                style={styles.cover}
                contentFit="cover"
                placeholder={colors.coverPlaceholder}
                transition={250}
                accessibilityRole="image"
                accessibilityLabel={`Foto de ${view.name}`}
              />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <MaterialCommunityIcons
                  name="storefront-outline"
                  size={48}
                  color={colors.textSecondary}
                />
              </View>
            )}
          </View>

          <View style={styles.basicInfo}>
            <Text style={styles.companyName}>{view.name}</Text>

            <Text style={styles.statusText}>
              Horário de Atendimento:{' '}
              <Text style={[styles.statusValue, { color: statusColor(view.status.tone, colors) }]}>
                {view.status.label}
              </Text>
            </Text>

            <Text style={styles.categoryText}>Categoria: {view.category}</Text>

            {view.addressLine ? (
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.addressText}>{view.addressLine}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.descriptionTitle}>Nossa Descrição (Simplificada)</Text>
            <Text style={styles.descriptionText} numberOfLines={4}>
              {view.description}
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.hoursCard}>
              <Text style={styles.hoursTitle}>Horário de Funcionamento</Text>

              {view.hoursRows.map((row, index) => (
                <View
                  key={row.key}
                  style={[
                    styles.hoursRow,
                    index < view.hoursRows.length - 1 && styles.hoursDivider,
                  ]}
                >
                  <Text style={styles.hoursLabel}>{row.label}</Text>
                  <Text style={[styles.hoursValue, row.closed && styles.hoursClosed]}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <View style={[styles.floatingNav, { top: insets.top + Spacing.two }]}>
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            favorite && styles.favoriteActive,
            pressed && styles.pressed,
          ]}
          onPress={handleToggleFavorite}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          accessibilityState={{ selected: favorite }}
        >
          <Ionicons
            name={favorite ? 'heart' : 'heart-outline'}
            size={21}
            color={favorite ? colors.background : colors.text}
          />
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        {!view.hasContact ? <ContactHintRow /> : null}

        <View style={styles.footerActions}>
          <Pressable
            style={({ pressed }) => [
              styles.whatsappButton,
              !view.whatsapp && styles.buttonDisabled,
              pressed && view.whatsapp ? styles.pressed : null,
            ]}
            onPress={() => {
              if (view.whatsapp) {
                if (company?._id) trackWhatsappClick(company._id);
                void openWhatsApp(view.whatsapp, WHATSAPP_MESSAGE);
              }
            }}
            disabled={!view.whatsapp}
            accessibilityRole="button"
            accessibilityLabel="Falar no WhatsApp"
            accessibilityState={{ disabled: !view.whatsapp }}
          >
            {view.whatsapp ? (
              <LinearGradient
                colors={ButtonGradients.whatsapp}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}

            <MaterialCommunityIcons
              name="whatsapp"
              size={20}
              color={view.whatsapp ? ButtonTextColors.whatsapp : colors.textSecondary}
            />
            <Text
              maxFontSizeMultiplier={1.4}
              style={[styles.whatsappButtonText, !view.whatsapp && styles.buttonDisabledText]}
            >
              WhatsApp
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.callButton,
              !view.phone && styles.buttonDisabled,
              pressed && view.phone ? styles.pressed : null,
            ]}
            onPress={() => {
              if (view.phone) void callPhone(view.phone);
            }}
            disabled={!view.phone}
            accessibilityRole="button"
            accessibilityLabel="Ligar para a empresa"
            accessibilityState={{ disabled: !view.phone }}
          >
            {view.phone ? (
              <LinearGradient
                colors={ButtonGradients.call}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            ) : null}

            <Ionicons
              name="call"
              size={18}
              color={view.phone ? ButtonTextColors.call : colors.textSecondary}
            />
            <Text
              maxFontSizeMultiplier={1.4}
              style={[styles.callButtonText, !view.phone && styles.buttonDisabledText]}
            >
              Ligar
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 0,
    },
    imageWrapper: {
      marginHorizontal: Spacing.three,
      marginTop: Spacing.three,
      marginBottom: Spacing.three,
    },
    cover: {
      width: '100%',
      aspectRatio: IMAGE_ASPECT_RATIO,
      minHeight: IMAGE_MIN_HEIGHT,
      maxHeight: IMAGE_MAX_HEIGHT,
      borderRadius: Radius.card,
      backgroundColor: colors.coverPlaceholder,
    },
    coverPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    basicInfo: {
      paddingHorizontal: Spacing.three,
      gap: Spacing.two,
      marginBottom: Spacing.three,
    },
    companyName: {
      color: colors.text,
      ...Typography.h2,
      letterSpacing: -0.3,
    },
    statusText: {
      color: colors.textSecondary,
      fontFamily: FontFamily.body500,
      fontSize: Type.sm.size,
      lineHeight: Type.sm.lineHeight,
      fontWeight: FontWeight.medium,
    },
    statusValue: {
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
    },
    categoryText: {
      color: colors.textSecondary,
      ...Typography.body,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    addressText: {
      flex: 1,
      color: colors.textSecondary,
      ...Typography.body,
    },
    section: {
      marginHorizontal: Spacing.three,
      marginBottom: Spacing.four,
    },
    descriptionTitle: {
      color: colors.primary,
      ...Typography.h4,
      fontFamily: FontFamily.heading700,
      fontWeight: FontWeight.bold,
      marginBottom: Spacing.two,
    },
    descriptionText: {
      color: colors.text,
      ...Typography.body,
    },
    hoursCard: {
      ...CardShadow,
      padding: Spacing.three,
      backgroundColor: colors.surface,
      borderRadius: Radius.detailCard,
      borderWidth: 0.5,
      borderColor: Overlays.goldBorder,
    },
    hoursTitle: {
      color: colors.text,
      ...Typography.h5,
      marginBottom: Spacing.two,
    },
    hoursRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.three,
      paddingVertical: Spacing.two,
    },
    hoursDivider: {
      borderBottomWidth: 0.5,
      borderBottomColor: Overlays.hairline,
    },
    hoursLabel: {
      color: colors.textSoft,
      fontFamily: FontFamily.body500,
      fontSize: Type.sm.size,
      lineHeight: Type.sm.lineHeight,
      fontWeight: FontWeight.medium,
    },
    hoursValue: {
      flexShrink: 1,
      color: colors.primary,
      ...Typography.bodyBold,
      textAlign: 'right',
    },
    hoursClosed: {
      color: colors.textSecondary,
      fontFamily: FontFamily.body500,
      fontSize: Type.sm.size,
      lineHeight: Type.sm.lineHeight,
      fontWeight: FontWeight.medium,
    },
    floatingNav: {
      position: 'absolute',
      left: Spacing.three,
      right: Spacing.three,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 20,
    },
    iconButton: {
      width: ICON_BUTTON_SIZE,
      height: ICON_BUTTON_SIZE,
      borderRadius: ICON_BUTTON_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    favoriteActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pressed: {
      opacity: 0.8,
    },
    footer: {
      ...CardShadow,
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: Spacing.three,
      paddingTop: Spacing.three,
      gap: Spacing.two,
      elevation: 16,
      shadowOpacity: 0.4,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: -4 },
    },
    footerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    whatsappButton: {
      flex: 1,
      height: 50,
      borderRadius: Radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.two,
      overflow: 'hidden',
      backgroundColor: colors.whatsapp,
    },
    whatsappButtonText: {
      color: ButtonTextColors.whatsapp,
      fontFamily: FontFamily.body800,
      fontSize: Type.sm.size,
      lineHeight: Type.sm.lineHeight,
      fontWeight: FontWeight.heavy,
    },
    callButton: {
      flex: 1,
      height: 50,
      borderRadius: Radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.two,
      overflow: 'hidden',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    callButtonText: {
      color: ButtonTextColors.call,
      fontFamily: FontFamily.body800,
      fontSize: Type.sm.size,
      lineHeight: Type.sm.lineHeight,
      fontWeight: FontWeight.heavy,
    },
    buttonDisabled: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.border,
    },
    buttonDisabledText: {
      color: colors.textSecondary,
    },
  });
}
