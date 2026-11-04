import { router } from 'expo-router';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Type } from '@/constants/theme';
import { getCompanies } from '@/services/api';
import type { Company } from '@/types/domain';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { InteractiveMap } from '@/features/map/interactive-map';
import type { MappableCompany } from '@/features/map/interactive-map.types';

export default function MapScreen() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = await getCompanies(1, 100);
        if (cancelled) return;
        const hydrated = await Promise.all(
          page.items.map(async (c) => {
            if (typeof c.latitude === 'number' && typeof c.longitude === 'number') return c;
            if (!c.address) return c;
            try {
              const results = await Location.geocodeAsync([c.address, c.city].filter(Boolean).join(', '));
              if (results.length > 0) {
                return { ...c, latitude: results[0].latitude, longitude: results[0].longitude };
              }
            } catch {
              // ignora
            }
            return c;
          }),
        );
        if (cancelled) return;
        setCompanies(hydrated);
      } catch {
        // ignora erros de rede/API
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const withCoords = companies.filter(
    (c): c is MappableCompany =>
      typeof c.latitude === 'number' && typeof c.longitude === 'number',
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Text style={styles.topButtonText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Mapa de empresas</Text>
        </View>
        {withCoords.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Nenhuma empresa com localização cadastrada.</Text>
          </View>
        ) : (
          <InteractiveMap companies={withCoords} />
        )}
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    safeArea: { flex: 1 },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    topButton: { paddingVertical: 6, paddingHorizontal: 10 },
    topButtonText: { color: colors.primary, fontSize: Type.base, fontWeight: '600' },
    title: { color: colors.text, fontSize: Type.headline, fontWeight: '700' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    emptyText: { color: colors.textSecondary, fontSize: Type.base, textAlign: 'center' },
  });
}