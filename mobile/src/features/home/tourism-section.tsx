import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { PaginationDots } from '@/components/PaginationDots';
import { Overlays, Radius, Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { hojeISO } from '@/features/tourism/event-meta';
import { getEvents, getTouristSpots } from '@/services/api';
import type { TourEvent, TouristSpot } from '@/types/domain';
import { pageIndexFromOffset } from '@/utils/carousel-page';

import { SectionHeader } from './section-header';
import { toTourismCards } from './tourism-view';

const TOURISM_CARD_WIDTH = 190;
const TOURISM_CARD_GAP = Spacing.two + Spacing.half;

/**
 * Seção "Turismo & Eventos" da Home: carrega atrações e eventos (em paralelo),
 * respeitando o filtro de cidade da Home, mostra indicador durante o
 * carregamento, mensagem curta em erro e some inteira quando não há nada
 * para exibir.
 */
export function TourismSection({ city }: { city?: string }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [events, setEvents] = useState<TourEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const reload = () => setToken((atual) => atual + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [paginaSpots, paginaEvents] = await Promise.all([
          getTouristSpots({ active: true, city, pageSize: 6 }),
          getEvents({ active: true, city, pageSize: 6 }),
        ]);
        if (!cancelled) {
          setSpots(paginaSpots.items);
          setEvents(paginaEvents.items);
        }
      } catch (erro) {
        if (!cancelled) {
          setSpots([]);
          setEvents([]);
          setError(
            erro instanceof Error ? erro.message : 'Erro ao carregar o turismo',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, city]);

  const cards = useMemo(
    () => toTourismCards(spots, events, hojeISO()),
    [spots, events],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      setActiveIndex(
        pageIndexFromOffset(
          contentOffset.x,
          TOURISM_CARD_WIDTH + TOURISM_CARD_GAP,
          cards.length,
          contentSize.width - layoutMeasurement.width,
        ),
      );
    },
    [cards.length],
  );

  // Sem oferta nenhuma, a seção inteira some (nem o título aparece).
  if (!loading && !error && cards.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Turismo & Eventos" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.feedback}>{error}</Text>
          <Pressable
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryPressed]}
            onPress={reload}
            accessibilityRole="button"
            accessibilityLabel="Tentar carregar o turismo novamente"
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
            snapToInterval={TOURISM_CARD_WIDTH + TOURISM_CARD_GAP}
            decelerationRate="fast"
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {cards.map((card) => {
              const icone =
                card.kind === 'event' ? 'calendar-star' : 'map-marker-circle';
              const tipoCard = card.kind === 'event' ? 'evento' : 'atração';

              return (
                <Pressable
                  key={card.id}
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                  onPress={() =>
                    router.push({
                      pathname:
                        card.kind === 'event'
                          ? '/event/[id]'
                          : '/tourist-spot/[id]',
                      params: { id: card.id },
                    })
                  }
                  // Rotas /tourist-spot/[id] e /event/[id] existem e o
                  // typed-routes cobre o push tipado (sem cast).
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${tipoCard}: ${card.title}`}
                >
                  <View style={styles.imageBox}>
                    {card.imageUrl ? (
                      <Image
                        source={{ uri: card.imageUrl }}
                        style={styles.image}
                        contentFit="cover"
                        placeholder={colors.coverPlaceholder}
                        transition={200}
                      />
                    ) : (
                      <View style={styles.imageFallback}>
                        <MaterialCommunityIcons
                          name={icone}
                          size={32}
                          color={colors.textSecondary}
                        />
                      </View>
                    )}

                    {card.badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{card.badge}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.body}>
                    <Text style={styles.title} numberOfLines={2}>
                      {card.title}
                    </Text>
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {card.subtitle}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <PaginationDots total={cards.length} activeIndex={activeIndex} />
        </>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    section: {
      marginBottom: Spacing.four,
    },
    center: {
      paddingVertical: Spacing.four,
      alignItems: 'center',
      gap: Spacing.two,
      paddingHorizontal: Spacing.three,
    },
    feedback: {
      color: colors.textSecondary,
      ...Typography.caption,
      textAlign: 'center',
    },
    retryButton: {
      paddingVertical: Spacing.two,
      paddingHorizontal: Spacing.three,
      borderRadius: Radius.chip,
      borderWidth: 1,
      borderColor: colors.border,
    },
    retryPressed: {
      opacity: 0.7,
    },
    retryText: {
      color: colors.primary,
            ...Typography.caption,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    carousel: {
      gap: TOURISM_CARD_GAP,
      paddingHorizontal: Spacing.three,
    },
    card: {
      width: TOURISM_CARD_WIDTH,
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    cardPressed: {
      opacity: 0.86,
      borderColor: Overlays.amberGlow,
    },
    imageBox: {
      height: 104,
      backgroundColor: colors.coverPlaceholder,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imageFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: Spacing.two,
      right: Spacing.two,
      backgroundColor: colors.primary,
      borderRadius: Radius.chip,
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.half,
    },
    badgeText: {
      color: colors.background,
            ...Typography.caption,
      fontFamily: FontFamily.body800,
      fontWeight: FontWeight.heavy,
    },
    body: {
      gap: Spacing.half,
      padding: Spacing.two + Spacing.half,
    },
    title: {
      color: colors.text,
            ...Typography.body,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,    },
    subtitle: {
      color: colors.textSecondary,
            ...Typography.caption,
    },
  });
}
