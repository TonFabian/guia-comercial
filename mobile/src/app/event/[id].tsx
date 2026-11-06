/**
 * Tela de detalhe de um evento turístico (a rota É a tela — AGENTS.md §6.2).
 * Evento VENCIDO continua abrindo normalmente, com o selo "Encerrado":
 * links compartilhados não quebram.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Overlays,
  Radius,
  Spacing,
  Type,
} from '@/constants/theme';
import {
  classificarEvento,
  descreverIngresso,
  formatarHorario,
  formatarPeriodoEvento,
  hojeISO,
  labelCategoriaEvento,
  type EstadoEvento,
} from '@/features/tourism/event-meta';
import {
  TourismAddressRow,
  TourismContactActions,
} from '@/features/tourism/tourism-actions';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useThemeMode } from '@/providers/theme-provider';
import { getEventById } from '@/services/api';
import type { TourEvent } from '@/types/domain';
import { openExternalUrl } from '@/utils/links';
import { cityName } from '@/utils/city';

/**
 * Selo do evento conforme o estado: o texto muda e a cor usa os tokens
 * (`primary`/`success`/`error`) — nunca dependência só de cor.
 */
const SELOS: Record<
  EstadoEvento,
  { texto: string; fundo: string; cor: 'primary' | 'success' | 'error' }
> = {
  'em-breve': { texto: 'Em breve', fundo: Overlays.amberTag, cor: 'primary' },
  agora: { texto: 'Acontece agora', fundo: Overlays.successTag, cor: 'success' },
  encerrado: { texto: 'Encerrado', fundo: Overlays.dangerTag, cor: 'error' },
};

export default function EventDetailScreen() {
  const colors = useThemeColors();
  const { mode } = useThemeMode();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [evento, setEvento] = useState<TourEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const encontrado = await getEventById(id);
        if (!cancelled) setEvento(encontrado);
      } catch (falha) {
        if (!cancelled) {
          setErro(
            falha instanceof Error ? falha.message : 'Erro ao carregar o evento',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function voltar() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!evento) {
    // Limitação conhecida: falha de rede chega como null (o serviço engole o
    // erro para cair no mock) e a tela distingue 404 de rede apenas quando
    // outro erro escapa — o comum é exibir "não encontrado".
    return (
      <View style={styles.centered}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <MaterialCommunityIcons
          name="calendar-star"
          size={42}
          color={colors.primary}
        />
        <Text style={styles.stateText}>{erro ?? 'Evento não encontrado.'}</Text>
        <Pressable
          style={styles.stateButton}
          onPress={voltar}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Text style={styles.stateButtonText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const estado = classificarEvento(evento.startDate, evento.endDate, hojeISO());
  const selo = SELOS[estado];
  const periodo = formatarPeriodoEvento(evento.startDate, evento.endDate);
  const horario = formatarHorario(evento.startTime, evento.endTime);
  const quando = [periodo, horario ?? ''].filter(Boolean).join(' · ');
  const ingresso = descreverIngresso(evento.ticket, evento.ticketPrice);
  const organizador =
    evento.organizer ??
    (evento.organizerCompany && typeof evento.organizerCompany !== 'string'
      ? evento.organizerCompany.name
      : undefined);

  return (
    <View style={styles.root}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={voltar}
            hitSlop={Spacing.two}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Text style={styles.backText}>← Voltar</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.photoBox}>
            {evento.photos?.[0] ? (
              <Image
                source={{ uri: evento.photos[0] }}
                style={styles.photo}
                contentFit="cover"
                placeholder={colors.coverPlaceholder}
                transition={250}
                accessibilityLabel={`Foto de ${evento.name}`}
              />
            ) : (
              <View style={styles.photoFallback}>
                <MaterialCommunityIcons
                  name="calendar-star"
                  size={40}
                  color={colors.textSecondary}
                />
              </View>
            )}
          </View>

          <View style={styles.headerGroup}>
            <View style={[styles.selo, { backgroundColor: selo.fundo }]}>
              <Text style={[styles.seloText, { color: colors[selo.cor] }]}>
                {selo.texto}
              </Text>
            </View>
            <Text style={styles.title}>{evento.name}</Text>
            <Text style={styles.meta}>
              {labelCategoriaEvento(evento.category)}
              {cityName(evento.city) ? ` · 📍 ${cityName(evento.city)}` : ''}
            </Text>
          </View>

          <View style={styles.whenRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.whenText}>{quando}</Text>
          </View>

          <Text style={styles.description}>{evento.description}</Text>

          {evento.location ? (
            <View style={styles.whenRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.whenText}>{evento.location}</Text>
            </View>
          ) : null}

          <TourismAddressRow
            address={evento.address}
            city={evento.city}
            latitude={evento.latitude}
            longitude={evento.longitude}
          />

          {ingresso ? (
            <View style={styles.whenRow}>
              <Ionicons name="ticket-outline" size={16} color={colors.primary} />
              <Text style={styles.whenText}>{ingresso}</Text>
            </View>
          ) : null}

          {evento.ticketUrl ? (
            <Pressable
              style={({ pressed }) => [styles.ticketButton, pressed && styles.pressed]}
              onPress={() => void openExternalUrl(evento.ticketUrl ?? '', 'Comprar ingresso')}
              accessibilityRole="button"
              accessibilityLabel="Comprar ingresso no site do evento"
            >
              <Text style={styles.ticketButtonText}>Comprar ingresso</Text>
            </Pressable>
          ) : null}

          {organizador ? (
            <Text style={styles.meta}>Organização: {organizador}</Text>
          ) : null}

          <TourismContactActions whatsapp={evento.whatsapp} phone={evento.phone} />
        </ScrollView>
      </SafeAreaView>
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
    topBar: {
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
    },
    backText: {
      color: colors.primary,
      fontSize: Type.small,
      fontWeight: '700',
    },
    content: {
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
      paddingBottom: Spacing.six,
    },
    photoBox: {
      height: 200,
      borderRadius: Radius.card,
      overflow: 'hidden',
      backgroundColor: colors.coverPlaceholder,
    },
    photo: {
      width: '100%',
      height: '100%',
    },
    photoFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerGroup: {
      gap: Spacing.half,
    },
    selo: {
      alignSelf: 'flex-start',
      paddingVertical: Spacing.half,
      paddingHorizontal: Spacing.two,
      borderRadius: Radius.chip,
    },
    seloText: {
      fontSize: Type.small,
      fontWeight: '800',
    },
    title: {
      color: colors.text,
      fontSize: Type.headline,
      fontWeight: '800',
    },
    meta: {
      color: colors.textSecondary,
      fontSize: Type.body,
    },
    whenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    whenText: {
      color: colors.textSecondary,
      fontSize: Type.body,
    },
    description: {
      color: colors.textSoft,
      fontSize: Type.base,
      lineHeight: 20,
    },
    ticketButton: {
      backgroundColor: colors.primary,
      borderRadius: Radius.pill,
      paddingVertical: Spacing.two + Spacing.two,
      alignItems: 'center',
    },
    ticketButtonText: {
      color: colors.background,
      fontSize: Type.base,
      fontWeight: '800',
    },
    pressed: {
      opacity: 0.8,
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
      fontSize: Type.base,
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
      fontSize: Type.base,
      fontWeight: '800',
    },
  });
}
