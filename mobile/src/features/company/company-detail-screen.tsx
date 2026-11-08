import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ButtonGradients,
  CardShadow,
  FontFamily,
  FontWeight,
  Glass,
  Overlays,
  Radius,
  Spacing,
  Type,
  Typography,
} from '@/constants/theme';
import { useFavorites } from '@/features/favorites/favorites-provider';
import { ContactHintRow } from '@/features/home/contact-hidden-hint';
import { SectionHeader } from '@/features/home/section-header';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useThemeMode } from '@/providers/theme-provider';
import { callPhone, openMapLink, openWhatsApp } from '@/utils/links';

import type { WorkingHours } from './company-details';
import { buildCompanyDetails } from './company-details';
import { CompanyGallery } from './company-gallery';
import { getOpeningStatus, type OpeningStatus } from './opening-hours';
import { useCompanyDetail } from './use-company-detail';

const WHATSAPP_MESSAGE =
  'Olá, vi sua empresa no aplicativo *Guia de Castelo do Piauí* e gostaria de mais informações!';
const SERVICE_WHATSAPP_PREFIX = 'Olá, tenho interesse no serviço de';

const HERO_HEIGHT = 230;
const LOGO_SIZE = 68;
const SERVICE_ICON_SIZE = 40;

const HOURS_ROWS: readonly { key: keyof WorkingHours; label: string }[] = [
  { key: 'weekdays', label: 'Segunda à sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const CLOSED_HOURS = 'Fechado';

function WorkingHoursCard({ hours }: { hours: WorkingHours }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const now = new Date();

  const status = getOpeningStatus(hours, now);
  const statusConfig: Record<OpeningStatus, { label: string; badge: any; dot: any; text: any }> = {
    open: {
      label: 'Aberto Agora',
      badge: styles.statusOpen,
      dot: styles.statusDotOpen,
      text: styles.statusTextOpen,
    },
    closed: {
      label: 'Fechado',
      badge: styles.statusClosed,
      dot: styles.statusDotClosed,
      text: styles.statusTextClosed,
    },
    unknown: {
      label: 'Consulte',
      badge: styles.statusUnknown,
      dot: styles.statusDotUnknown,
      text: styles.statusTextUnknown,
    },
  };
  const config = statusConfig[status];

  return (
    <View style={styles.hoursCard}>
      <View style={styles.hoursCardHeader}>
        <View style={styles.hoursCardTitleGroup}>
          <Ionicons name="time-outline" size={16} color={colors.primary} />
          <Text style={styles.hoursCardTitle}>Atendimento</Text>
        </View>

        <View style={[styles.statusBadge, config.badge]}>
          <View style={[styles.statusDot, config.dot]} />
          <Text style={[styles.statusText, config.text]}>{config.label}</Text>
        </View>
      </View>

      <View style={styles.hoursHeaderDivider} />

      {HOURS_ROWS.map((row, index) => {
        const value = hours[row.key];
        const isLast = index === HOURS_ROWS.length - 1;
        const isUnavailable = value === CLOSED_HOURS || value.toLowerCase().includes('consulte');

        return (
          <View key={row.key} style={[styles.hoursRow, !isLast && styles.hoursDivider]}>
            <Text style={styles.hoursLabel}>{row.label}</Text>
            <Text style={[styles.hoursValue, isUnavailable && styles.hoursClosed]}>{value}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function CompanyDetailScreen({ companyId }: { companyId: string }) {
  const colors = useThemeColors();
  const { mode } = useThemeMode();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { company, loading, error } = useCompanyDetail(companyId);
  const { isFavorite, toggleFavorite } = useFavorites();
  const details = useMemo(() => (company ? buildCompanyDetails(company) : null), [company]);
  const favorite = company ? isFavorite(company._id) : false;

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }

  function handleToggleFavorite() {
    if (!company) return;
    toggleFavorite(company);
    void Haptics.selectionAsync().catch(() => undefined);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.stateText}>Carregando empresa...</Text>
        <Pressable style={styles.stateButton} onPress={goBack} accessibilityRole="button">
          <Text style={styles.stateButtonText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.centered}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <MaterialCommunityIcons name="alert-circle-outline" size={42} color={colors.primary} />
        <Text style={styles.stateText}>{error ?? 'Empresa não encontrada.'}</Text>
        <Pressable style={styles.stateButton} onPress={goBack} accessibilityRole="button">
          <Text style={styles.stateButtonText}>Voltar para a Home</Text>
        </Pressable>
      </View>
    );
  }

  const hasContact = Boolean(details.whatsapp || details.phone);
  const location = [details.city, details.address].filter(Boolean).join(' • ');
  const whatsapp = details.whatsapp;

  function handleServicePress(serviceName: string) {
    if (!whatsapp) {
      Alert.alert(
        'WhatsApp indisponível',
        'Esta empresa ainda não cadastrou um WhatsApp para contato.',
      );
      return;
    }

    void openWhatsApp(whatsapp, `${SERVICE_WHATSAPP_PREFIX} ${serviceName}`);
  }

  return (
    <View style={styles.root}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.six * 2 },
        ]}
      >
        <View style={styles.hero}>
          {details.coverUrl ? (
            <>
              <Image
                source={{ uri: details.coverUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={250}
                accessibilityLabel={`Foto de ${details.name}`}
              />
              <LinearGradient
                colors={['transparent', colors.background]}
                locations={[0.3, 1]}
                style={StyleSheet.absoluteFill}
              />
            </>
          ) : (
            <LinearGradient
              colors={[colors.surfaceAlt, colors.background]}
              style={StyleSheet.absoluteFill}
            />
          )}
        </View>

        <View style={styles.basicInfo}>
          <View style={styles.logoCircle}>
            {details.logoUrl ? (
              <Image
                source={{ uri: details.logoUrl }}
                style={styles.logoImage}
                contentFit="cover"
                transition={200}
                accessibilityLabel={`Logo de ${details.name}`}
              />
            ) : (
              <MaterialCommunityIcons name="office-building" size={38} color={colors.primary} />
            )}
          </View>

          <Text style={styles.companyName}>{details.name}</Text>

          <View style={styles.metaRow}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{details.category}</Text>
            </View>

            {details.registry ? (
              <View style={styles.registryTag}>
                <Text style={styles.registryText}>{details.registry}</Text>
              </View>
            ) : null}

            {details.isFeatured ? (
              <View style={styles.featuredTag}>
                <Text style={styles.featuredTagText}>Destaque</Text>
              </View>
            ) : null}
          </View>

          {details.promotion ? (
            <View style={styles.promotionBanner}>
              <Text style={styles.promotionText}>🔥 {details.promotion}</Text>
            </View>
          ) : null}

          {location ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.addressText} numberOfLines={2}>
                {location}
              </Text>

              {details.mapLink ? (
                <Pressable
                  style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}
                  onPress={() => {
                    if (details.mapLink) void openMapLink(details.mapLink);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir endereço no mapa"
                >
                  <Text style={styles.mapAction}>Ver mapa</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        <CompanyGallery media={details.media} />

        <View style={styles.section}>
          <View style={styles.storyCard}>
            <Text style={styles.storyTitle}>{details.about.title}</Text>
            <Text style={styles.storyText}>{details.about.text}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Nossos Serviços Principais" />

          <View style={styles.servicesList}>
            {details.servicesList.length > 0 ? (
              details.servicesList.map((service) => (
                <Pressable
                  key={service.name}
                  style={({ pressed }) => [
                    styles.serviceCard,
                    pressed && styles.serviceCardPressed,
                  ]}
                  onPress={() => handleServicePress(service.name)}
                  accessibilityRole="button"
                  accessibilityLabel={`Falar sobre ${service.name} no WhatsApp`}
                >
                  <View style={styles.serviceIconBox}>
                    <MaterialCommunityIcons name={service.icon} size={20} color={colors.primary} />
                  </View>

                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
              ))
            ) : (
              <Text style={styles.emptyServices}>Serviços sob consulta.</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Horários de Funcionamento" />
          <WorkingHoursCard hours={details.workingHours} />
        </View>
      </ScrollView>

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
            color={favorite ? colors.primary : colors.text}
          />
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        {!hasContact ? <ContactHintRow /> : null}

        <View style={styles.footerActions}>
          <Pressable
            style={({ pressed }) => [
              styles.whatsappButton,
              !details.whatsapp && styles.buttonDisabled,
              pressed && details.whatsapp ? styles.pressed : null,
            ]}
            onPress={() => {
              if (details.whatsapp) void openWhatsApp(details.whatsapp, WHATSAPP_MESSAGE);
            }}
            disabled={!details.whatsapp}
            accessibilityRole="button"
            accessibilityLabel="Falar no WhatsApp"
            accessibilityState={{ disabled: !details.whatsapp }}
          >
            {details.whatsapp ? (
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
              color={details.whatsapp ? colors.background : colors.textSecondary}
            />
            <Text
              style={[styles.whatsappButtonText, !details.whatsapp && styles.buttonDisabledText]}
            >
              WhatsApp
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.callButton,
              !details.phone && styles.buttonDisabled,
              pressed && details.phone ? styles.pressed : null,
            ]}
            onPress={() => {
              if (details.phone) void callPhone(details.phone);
            }}
            disabled={!details.phone}
            accessibilityRole="button"
            accessibilityLabel="Ligar para a empresa"
            accessibilityState={{ disabled: !details.phone }}
          >
            {details.phone ? (
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
              color={details.phone ? colors.background : colors.textSecondary}
            />
            <Text style={[styles.callButtonText, !details.phone && styles.buttonDisabledText]}>
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
    scrollContent: {
      paddingTop: 0,
    },
    hero: {
      height: HERO_HEIGHT,
      backgroundColor: colors.surfaceAlt,
    },
    basicInfo: {
      paddingHorizontal: Spacing.four,
      paddingBottom: Spacing.three,
      gap: 10,
    },
    logoCircle: {
      width: LOGO_SIZE,
      height: LOGO_SIZE,
      marginTop: -(LOGO_SIZE / 2),
      borderRadius: LOGO_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 2,
      borderColor: colors.primary,
      overflow: 'hidden',
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    companyName: {
      color: colors.text,
      ...Typography.h2,
      fontFamily: FontFamily.heading800,
      fontWeight: FontWeight.heavy,
      letterSpacing: -0.3,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: Spacing.two,
    },
    categoryTag: {
      backgroundColor: Overlays.amberTag,
      borderRadius: Radius.chip,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingVertical: Spacing.half,
      paddingHorizontal: 10,
    },
    categoryText: {
      color: colors.primary,
      fontFamily: FontFamily.body700,
      fontSize: Type.xs.size,
      lineHeight: Type.xs.lineHeight,
      fontWeight: FontWeight.bold,
    },
    registryTag: {
      backgroundColor: Glass.surface,
      borderRadius: Radius.chip,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: Spacing.half,
      paddingHorizontal: 10,
    },
    registryText: {
      color: colors.textSecondary,
      ...Typography.captionSemibold,
    },
    featuredTag: {
      backgroundColor: colors.primary,
      borderRadius: Radius.chip,
      paddingVertical: Spacing.half,
      paddingHorizontal: 10,
    },
    featuredTagText: {
      color: colors.background,
      fontFamily: FontFamily.body800,
      fontSize: Type.xs.size,
      lineHeight: Type.xs.lineHeight,
      fontWeight: FontWeight.heavy,
    },
    promotionBanner: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.primary,
      padding: Spacing.two,
      marginHorizontal: Spacing.four,
    },
    promotionText: {
      color: colors.primary,
      ...Typography.bodyBold,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    addressText: {
      flex: 1,
      color: colors.textSecondary,
      ...Typography.body,
    },
    mapButton: {
      backgroundColor: colors.primary,
      borderRadius: Radius.pill,
      paddingVertical: Spacing.one + 2,
      paddingHorizontal: Spacing.three,
    },
    mapAction: {
      color: colors.background,
      fontFamily: FontFamily.body800,
      fontSize: Type.xs.size,
      lineHeight: Type.xs.lineHeight,
      fontWeight: FontWeight.heavy,
    },
    section: {
      marginBottom: Spacing.four,
    },
    storyCard: {
      ...CardShadow,
      marginHorizontal: Spacing.three,
      padding: Spacing.four,
      gap: Spacing.two,
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 0.5,
      borderColor: Overlays.goldBorder,
    },
    storyTitle: {
      color: colors.primary,
      ...Typography.h4,
      fontFamily: FontFamily.heading800,
      fontWeight: FontWeight.heavy,
      letterSpacing: 0.2,
    },
    storyText: {
      color: colors.textSoft,
      ...Typography.body,
    },
    servicesList: {
      paddingHorizontal: Spacing.three,
      gap: Spacing.two,
    },
    serviceCard: {
      ...CardShadow,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingVertical: Spacing.two,
      paddingHorizontal: Spacing.three,
      backgroundColor: colors.surface,
      borderRadius: Radius.detailCard,
      borderWidth: 1,
      borderColor: Overlays.goldSoftBorder,
    },
    serviceCardPressed: {
      opacity: 0.82,
      backgroundColor: colors.surfaceAlt,
    },
    serviceIconBox: {
      width: SERVICE_ICON_SIZE,
      height: SERVICE_ICON_SIZE,
      borderRadius: Radius.chip,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Overlays.amberTag,
    },
    serviceName: {
      flex: 1,
      color: colors.text,
      ...Typography.bodyBold,
    },
    emptyServices: {
      color: colors.textSecondary,
      ...Typography.body,
    },
    hoursCard: {
      ...CardShadow,
      marginHorizontal: Spacing.three,
      padding: Spacing.four,
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 0.5,
      borderColor: Overlays.goldBorder,
    },
    hoursCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: Spacing.two,
    },
    hoursCardTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    hoursCardTitle: {
      color: colors.text,
      fontFamily: FontFamily.heading700,
      fontSize: Type.sm.size,
      lineHeight: Type.sm.lineHeight,
      fontWeight: FontWeight.bold,
    },
    hoursHeaderDivider: {
      marginTop: Spacing.two,
      borderBottomWidth: 0.5,
      borderBottomColor: Overlays.hairline,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.one,
      paddingVertical: Spacing.one,
      paddingHorizontal: Spacing.two,
      borderRadius: Radius.pill,
    },
    statusOpen: {
      backgroundColor: Overlays.successTag,
    },
    statusClosed: {
      backgroundColor: Overlays.dangerTag,
    },
    statusUnknown: {
      backgroundColor: Overlays.neutralTag,
    },
    statusDot: {
      width: Spacing.two,
      height: Spacing.two,
      borderRadius: Spacing.one,
    },
    statusDotOpen: {
      backgroundColor: colors.success,
    },
    statusDotClosed: {
      backgroundColor: colors.error,
    },
    statusDotUnknown: {
      backgroundColor: colors.textSecondary,
    },
    statusText: {
      fontFamily: FontFamily.body700,
      fontSize: Type.xs.size,
      lineHeight: Type.xs.lineHeight,
      fontWeight: FontWeight.bold,
    },
    statusTextOpen: {
      color: colors.success,
    },
    statusTextClosed: {
      color: colors.error,
    },
    statusTextUnknown: {
      color: colors.textSecondary,
    },
    hoursRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.three,
      paddingVertical: Spacing.three,
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
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Overlays.scrim,
      borderWidth: 1,
      borderColor: colors.border,
    },
    favoriteActive: {
      backgroundColor: Overlays.amberTag,
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
      backgroundColor: colors.surface,
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
      gap: 10,
    },
    whatsappButton: {
      flex: 1.6,
      height: 54,
      borderRadius: Radius.detailCard,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.two,
      overflow: 'hidden',
      backgroundColor: colors.whatsapp,
    },
    whatsappButtonText: {
      color: colors.background,
      fontFamily: FontFamily.body800,
      fontSize: Type.sm.size,
      lineHeight: Type.sm.lineHeight,
      fontWeight: FontWeight.heavy,
    },
    callButton: {
      flex: 1,
      height: 54,
      borderRadius: Radius.detailCard,
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
      color: colors.background,
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
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.three,
      padding: Spacing.four,
      backgroundColor: colors.background,
    },
    stateText: {
      color: colors.textSecondary,
      ...Typography.body,
      textAlign: 'center',
    },
    stateButton: {
      backgroundColor: colors.primary,
      borderRadius: Radius.pill,
      paddingVertical: 10,
      paddingHorizontal: Spacing.four,
    },
    stateButtonText: {
      color: colors.background,
      fontFamily: FontFamily.body800,
      fontSize: Type.sm.size,
      lineHeight: Type.sm.lineHeight,
      fontWeight: FontWeight.heavy,
    },
  });
}
