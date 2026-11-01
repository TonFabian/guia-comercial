import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
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
  Glass,
  GuiaColors,
  Overlays,
  Radius,
  Spacing,
  Type,
} from '@/constants/theme';
import { ContactHintRow } from '@/features/home/contact-hidden-hint';
import { SectionHeader } from '@/features/home/section-header';
import { callPhone, openMapLink, openWhatsApp } from '@/utils/links';

import { buildCompanyDetails } from './company-details';
import type { WorkingHours } from './company-details';
import { CompanyGallery } from './company-gallery';
import { getOpeningStatus } from './opening-hours';
import { useCompanyDetail } from './use-company-detail';

const WHATSAPP_MESSAGE =
  'Olá, vi sua empresa no aplicativo Guia de Castelo do Piauí e gostaria de mais informações!';
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
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const status = getOpeningStatus(hours, now);
  const statusConfig = {
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
  }[status];

  return (
    <View style={styles.hoursCard}>
      <View style={styles.hoursCardHeader}>
        <View style={styles.hoursCardTitleGroup}>
          <Ionicons name="time-outline" size={16} color={GuiaColors.primary} />
          <Text style={styles.hoursCardTitle}>Atendimento</Text>
        </View>

        <View style={[styles.statusBadge, statusConfig.badge]}>
          <View style={[styles.statusDot, statusConfig.dot]} />
          <Text style={[styles.statusText, statusConfig.text]}>{statusConfig.label}</Text>
        </View>
      </View>

      <View style={styles.hoursHeaderDivider} />

      {HOURS_ROWS.map((row, index) => {
        const value = hours[row.key];
        const isLast = index === HOURS_ROWS.length - 1;
        const isUnavailable =
          value === CLOSED_HOURS || value.toLowerCase().includes('consulte');

        return (
          <View key={row.key} style={[styles.hoursRow, !isLast && styles.hoursDivider]}>
            <Text style={styles.hoursLabel}>{row.label}</Text>
            <Text style={[styles.hoursValue, isUnavailable && styles.hoursClosed]}>
              {value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function CompanyDetailScreen({ companyId }: { companyId: string }) {
  const insets = useSafeAreaInsets();
  const { company, loading, error } = useCompanyDetail(companyId);
  const details = useMemo(() => (company ? buildCompanyDetails(company) : null), [company]);
  const [favorite, setFavorite] = useState(false);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }

  function toggleFavorite() {
    setFavorite((current) => !current);
    void Haptics.selectionAsync().catch(() => undefined);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={GuiaColors.primary} />
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
        <StatusBar style="light" />
        <MaterialCommunityIcons name="alert-circle-outline" size={42} color={GuiaColors.primary} />
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
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.six * 2 },
        ]}>
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
                colors={['transparent', GuiaColors.background]}
                locations={[0.3, 1]}
                style={StyleSheet.absoluteFill}
              />
            </>
          ) : (
            <LinearGradient
              colors={[GuiaColors.surfaceAlt, GuiaColors.background]}
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
              <MaterialCommunityIcons
                name="office-building"
                size={38}
                color={GuiaColors.primary}
              />
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

          {location ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color={GuiaColors.textSecondary} />
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
                  accessibilityLabel="Abrir endereço no mapa">
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
                  accessibilityLabel={`Falar sobre ${service.name} no WhatsApp`}>
                  <View style={styles.serviceIconBox}>
                    <MaterialCommunityIcons
                      name={service.icon}
                      size={20}
                      color={GuiaColors.primary}
                    />
                  </View>

                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={GuiaColors.textSecondary}
                  />
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
          accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={22} color={GuiaColors.text} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            favorite && styles.favoriteActive,
            pressed && styles.pressed,
          ]}
          onPress={toggleFavorite}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          accessibilityState={{ selected: favorite }}>
          <Ionicons
            name={favorite ? 'heart' : 'heart-outline'}
            size={21}
            color={favorite ? GuiaColors.primary : GuiaColors.text}
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
            accessibilityState={{ disabled: !details.whatsapp }}>
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
              color={details.whatsapp ? GuiaColors.background : GuiaColors.textSecondary}
            />
            <Text
              style={[
                styles.whatsappButtonText,
                !details.whatsapp && styles.buttonDisabledText,
              ]}>
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
            accessibilityState={{ disabled: !details.phone }}>
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
              color={details.phone ? GuiaColors.background : GuiaColors.textSecondary}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GuiaColors.background,
  },
  scrollContent: {
    paddingTop: 0,
  },
  hero: {
    height: HERO_HEIGHT,
    backgroundColor: GuiaColors.surfaceAlt,
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
    backgroundColor: GuiaColors.surfaceAlt,
    borderWidth: 2,
    borderColor: GuiaColors.primary,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  companyName: {
    color: GuiaColors.text,
    fontSize: Type.headline,
    fontWeight: '800',
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
    borderColor: GuiaColors.primary,
    paddingVertical: Spacing.half,
    paddingHorizontal: 10,
  },
  categoryText: {
    color: GuiaColors.primary,
    fontSize: Type.small,
    fontWeight: '700',
  },
  registryTag: {
    backgroundColor: Glass.surface,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: Glass.border,
    paddingVertical: Spacing.half,
    paddingHorizontal: 10,
  },
  registryText: {
    color: GuiaColors.textSecondary,
    fontSize: Type.small,
    fontWeight: '600',
  },
  featuredTag: {
    backgroundColor: GuiaColors.primary,
    borderRadius: Radius.chip,
    paddingVertical: Spacing.half,
    paddingHorizontal: 10,
  },
  featuredTagText: {
    color: GuiaColors.background,
    fontSize: Type.small,
    fontWeight: '800',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    flex: 1,
    color: GuiaColors.textSecondary,
    fontSize: Type.body,
    lineHeight: 18,
  },
  mapButton: {
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
  },
  mapAction: {
    color: GuiaColors.primary,
    fontSize: Type.small,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.four,
  },
  storyCard: {
    ...CardShadow,
    marginHorizontal: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
    backgroundColor: GuiaColors.surface,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: Overlays.goldBorder,
  },
  storyTitle: {
    color: GuiaColors.primary,
    fontSize: Type.title,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  storyText: {
    color: GuiaColors.textSoft,
    fontSize: Type.base,
    lineHeight: 24,
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
    backgroundColor: GuiaColors.surface,
    borderRadius: Radius.detailCard,
    borderWidth: 1,
    borderColor: Overlays.goldSoftBorder,
  },
  serviceCardPressed: {
    opacity: 0.82,
    backgroundColor: GuiaColors.surfaceAlt,
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
    color: GuiaColors.text,
    fontSize: Type.base,
    fontWeight: '700',
  },
  emptyServices: {
    color: GuiaColors.textSecondary,
    fontSize: Type.base,
  },
  hoursCard: {
    ...CardShadow,
    marginHorizontal: Spacing.three,
    padding: Spacing.four,
    backgroundColor: GuiaColors.surface,
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
    color: GuiaColors.text,
    fontSize: Type.subtitle,
    fontWeight: '700',
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
    backgroundColor: GuiaColors.success,
  },
  statusDotClosed: {
    backgroundColor: GuiaColors.error,
  },
  statusDotUnknown: {
    backgroundColor: GuiaColors.textSecondary,
  },
  statusText: {
    fontSize: Type.small,
    fontWeight: '700',
  },
  statusTextOpen: {
    color: GuiaColors.success,
  },
  statusTextClosed: {
    color: GuiaColors.error,
  },
  statusTextUnknown: {
    color: GuiaColors.textSecondary,
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
    color: GuiaColors.textSoft,
    fontSize: Type.base,
    fontWeight: '500',
  },
  hoursValue: {
    flexShrink: 1,
    color: GuiaColors.primary,
    fontSize: Type.base,
    fontWeight: '700',
    textAlign: 'right',
  },
  hoursClosed: {
    color: GuiaColors.textSecondary,
    fontWeight: '500',
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
    borderColor: Glass.border,
  },
  favoriteActive: {
    backgroundColor: Overlays.amberTag,
    borderColor: GuiaColors.primary,
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
    backgroundColor: GuiaColors.surface,
    borderTopWidth: 1,
    borderTopColor: Glass.border,
    paddingHorizontal: Spacing.three,
    paddingTop: 12,
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
    backgroundColor: GuiaColors.whatsapp,
  },
  whatsappButtonText: {
    color: GuiaColors.background,
    fontSize: Type.base,
    fontWeight: '800',
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
    backgroundColor: GuiaColors.surfaceAlt,
    borderWidth: 1,
    borderColor: GuiaColors.primary,
  },
  callButtonText: {
    color: GuiaColors.background,
    fontSize: Type.base,
    fontWeight: '800',
  },
  buttonDisabled: {
    backgroundColor: GuiaColors.surfaceAlt,
    borderColor: Glass.border,
  },
  buttonDisabledText: {
    color: GuiaColors.textSecondary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    backgroundColor: GuiaColors.background,
  },
  stateText: {
    color: GuiaColors.textSecondary,
    fontSize: Type.base,
    textAlign: 'center',
  },
  stateButton: {
    backgroundColor: GuiaColors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    paddingHorizontal: Spacing.four,
  },
  stateButtonText: {
    color: GuiaColors.background,
    fontSize: Type.base,
    fontWeight: '800',
  },
});
