import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';

import { Radius, Spacing, Type } from '@/constants/theme';
import { getCompanies } from '@/services/api';
import type { Company } from '@/types/domain';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { openCompanyDetails } from '@/features/company/open-company';

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
        setCompanies(page.items);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const withCoords = companies.filter(
    (c) => typeof c.latitude === 'number' && typeof c.longitude === 'number',
  );

  const initialRegion =
    withCoords.length > 0
      ? {
          latitude: withCoords[0].latitude as number,
          longitude: withCoords[0].longitude as number,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }
      : { latitude: -3.7319, longitude: -38.5267, latitudeDelta: 0.1, longitudeDelta: 0.1 };

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
          <MapView style={styles.map} initialRegion={initialRegion}>
            {withCoords.map((company) => (
              <Marker
                key={company._id}
                coordinate={{ latitude: company.latitude as number, longitude: company.longitude as number }}
                title={company.name}
                description={company.address ?? undefined}
                onPress={() => openCompanyDetails(company._id)}
              />
            ))}
          </MapView>
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
    map: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    emptyText: { color: colors.textSecondary, fontSize: Type.base, textAlign: 'center' },
  });
}