import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Overlays, Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { hojeISO } from '@/features/tourism/event-meta';
import { getEvents, getTouristSpots } from '@/services/api';
import type { TourEvent, TouristSpot } from '@/types/domain';

import { SectionHeader } from './section-header';
import { toTourismCards } from './tourism-view';

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

  const reload = () => setToken((atual) => atual + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [listaSpots, listaEvents] = await Promise.all([
          getTouristSpots({ active: true, city, pageSize: 6 }),
          getEvents({ active: true, city, pageSize: 6 }),
        ]);
        if (!cancelled) {
          setSpots(listaSpots);
          setEvents(listaEvents);
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
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
      fontSize: Type.small,
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
      fontSize: Type.small,
      fontWeight: '700',
    },
    carousel: {
      gap: Spacing.two + Spacing.half,
      paddingHorizontal: Spacing.three,
    },
    card: {
      width: 190,
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
      fontSize: Type.caption,
      fontWeight: '800',
    },
    body: {
      gap: Spacing.half,
      padding: Spacing.two + Spacing.half,
    },
    title: {
      color: colors.text,
      fontSize: Type.base,
      fontWeight: '700',
      lineHeight: 18,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: Type.small,
      lineHeight: 16,
    },
  });
}
