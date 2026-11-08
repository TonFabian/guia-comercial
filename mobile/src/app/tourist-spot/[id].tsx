/**
 * Tela de detalhe de um ponto turístico (a rota É a tela — AGENTS.md §6.2).
 * Compondo subcomponentes de features/tourism/ e utilitários do repo.
 */
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Overlays, Radius, Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import {
  descreverEntrada,
  labelCategoriaAtracao,
} from '@/features/tourism/event-meta';
import {
  TourismAddressRow,
  TourismContactActions,
} from '@/features/tourism/tourism-actions';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useThemeMode } from '@/providers/theme-provider';
import { getTouristSpotById } from '@/services/api';
import {
  formatOpeningRange,
  scheduleToOpeningHours,
} from '@/features/company/opening-hours';
import type { TouristSpot } from '@/types/domain';
import { openExternalUrl } from '@/utils/links';
import { cityName } from '@/utils/city';

/** Link do Instagram: aceita "@handle" (padrão vindo do cadastro) ou URL. */
function linkInstagram(instagram: string): string {
  if (instagram.startsWith('http')) return instagram;
  const handle = instagram.startsWith('@') ? instagram.slice(1) : instagram;
  return `https://instagram.com/${handle}`;
}

export default function TouristSpotDetailScreen() {
  const colors = useThemeColors();
  const { mode } = useThemeMode();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [spot, setSpot] = useState<TouristSpot | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const encontrado = await getTouristSpotById(id);
        if (!cancelled) setSpot(encontrado);
      } catch (falha) {
        if (!cancelled) {
          setErro(
            falha instanceof Error ? falha.message : 'Erro ao carregar a atração',
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

  if (!spot) {
    // Limitação conhecida: falha de rede chega como null (o serviço engole o
    // erro para cair no mock) e a tela distingue 404 de rede apenas quando
    // outro erro escapa — o comum é exibir "não encontrada".
    return (
      <View style={styles.centered}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <MaterialCommunityIcons
          name="map-marker-circle"
          size={42}
          color={colors.primary}
        />
        <Text style={styles.stateText}>{erro ?? 'Atração não encontrada.'}</Text>
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

  const cidade = cityName(spot.city);
  const entrada = descreverEntrada(spot.entryFee, spot.entryPrice);
  const fotoPrincipal = spot.photos?.[0];

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
            {fotoPrincipal ? (
              <Image
                source={{ uri: fotoPrincipal }}
                style={styles.photo}
                contentFit="cover"
                placeholder={colors.coverPlaceholder}
                transition={250}
                accessibilityLabel={`Foto de ${spot.name}`}
              />
            ) : (
              <View style={styles.photoFallback}>
                <MaterialCommunityIcons
                  name="map-marker-circle"
                  size={40}
                  color={colors.textSecondary}
                />
              </View>
            )}
          </View>

          <View style={styles.headerGroup}>
            <Text style={styles.title}>{spot.name}</Text>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{labelCategoriaAtracao(spot.category)}</Text>
            </View>
            {cidade ? <Text style={styles.meta}>📍 {cidade}</Text> : null}
          </View>

          <Text style={styles.description}>{spot.description}</Text>

          {(() => {
            const linhas =
              spot.schedule && spot.schedule.length > 0
                ? scheduleToOpeningHours(spot.schedule).map(formatOpeningRange)
                : [];
            if (linhas.length === 0) return null;
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Horários</Text>
                {linhas.map((periodo) => (
                  <View key={periodo} style={styles.hourRow}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={styles.hourText}>{periodo}</Text>
                  </View>
                ))}
              </View>
            );
          })()}

          {entrada ? (
            <Text style={styles.meta}>🎟️ {entrada}</Text>
          ) : null}

          <TourismAddressRow
            address={spot.address}
            city={spot.city}
            latitude={spot.latitude}
            longitude={spot.longitude}
          />

          <TourismContactActions whatsapp={spot.whatsapp} phone={spot.phone} />

          {spot.website ? (
            <Pressable
              style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
              onPress={() => void openExternalUrl(spot.website ?? '', 'Site')}
              accessibilityRole="button"
              accessibilityLabel="Abrir o site da atração"
            >
              <MaterialCommunityIcons
                name="web"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.linkText}>Site oficial</Text>
            </Pressable>
          ) : null}

          {spot.instagram ? (
            <Pressable
              style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
              onPress={() =>
                void openExternalUrl(linkInstagram(spot.instagram ?? ''), 'Instagram')
              }
              accessibilityRole="button"
              accessibilityLabel="Abrir o Instagram da atração"
            >
              <MaterialCommunityIcons
                name="instagram"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.linkText}>Instagram</Text>
            </Pressable>
          ) : null}
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
            ...Typography.body,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
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
    title: {
      color: colors.text,
            ...Typography.h2,
      fontFamily: FontFamily.heading800,
      fontWeight: FontWeight.heavy,
      position: 'absolute', left: 0, right: 0, textAlign: 'center',
    },
    tag: {
      alignSelf: 'flex-start',
      backgroundColor: Overlays.amberTag,
      paddingVertical: Spacing.half,
      paddingHorizontal: Spacing.two,
      borderRadius: Radius.chip,
    },
    tagText: {
      color: colors.primary,
            ...Typography.caption,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    meta: {
      color: colors.textSecondary,
      ...Typography.body,
    },
    description: {
      color: colors.textSoft,
            ...Typography.body,
    },
    section: {
      gap: Spacing.two,
    },
    sectionTitle: {
      color: colors.text,
            ...Typography.h5,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    hourRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    hourText: {
      color: colors.textSecondary,
      ...Typography.body,
    },
    linkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      paddingVertical: Spacing.two,
      paddingHorizontal: Spacing.three,
      borderRadius: Radius.chip,
      borderWidth: 1,
      borderColor: colors.border,
    },
    linkText: {
      color: colors.primary,
            ...Typography.body,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
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
            ...Typography.body,
      fontFamily: FontFamily.body800,
      fontWeight: FontWeight.heavy,
    },
  });
}
