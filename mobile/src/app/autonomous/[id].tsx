import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography, FontFamily, FontWeight } from '@/constants/theme';
import { getAutonomousProfessionals } from '@/services/api';
import type { AutonomousProfessional } from '@/types/domain';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { TopBackButton } from '@/components/top-back-button';
import { openWhatsApp, callPhone } from '@/utils/links';
import { cityName } from '@/utils/city';

export default function AutonomousDetailScreen() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pro, setPro] = useState<AutonomousProfessional | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getAutonomousProfessionals();
        const found = list.find((p) => p._id === id) ?? null;
        if (!cancelled) setPro(found);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!pro) {
    return (
      <View style={styles.center}>
        <StatusBar style="light" />
        <Text style={styles.notFound}>Profissional não encontrado.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.topBar}>
          <TopBackButton onPress={() => router.back()} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{pro.name}</Text>
          <Text style={styles.specialty}>{pro.specialty}</Text>
          {pro.description ? <Text style={styles.desc}>{pro.description}</Text> : null}
          {pro.city ? <Text style={styles.meta}>📍 {cityName(pro.city)}</Text> : null}
          {pro.whatsapp ? (
            <TouchableOpacity style={styles.whatsappBtn} onPress={() => void openWhatsApp(pro.whatsapp as string)}>
              <Text style={styles.whatsappBtnText}>Contatar via WhatsApp</Text>
            </TouchableOpacity>
          ) : pro.phone ? (
            <TouchableOpacity style={styles.whatsappBtn} onPress={() => void callPhone(pro.phone as string)}>
              <Text style={styles.whatsappBtnText}>Ligar</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    safeArea: { flex: 1 },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    topButton: { paddingVertical: 6, paddingHorizontal: 10 },
    topButtonText: { color: colors.primary, ...Typography.body, fontFamily: FontFamily.body600, fontWeight: FontWeight.semibold },
    content: { padding: 16, gap: 12 },
    title: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: colors.text, ...Typography.h3 },
    specialty: { color: colors.primary, ...Typography.h5 },
    desc: { color: colors.textSecondary, ...Typography.body, lineHeight: 20 },
    meta: { color: colors.textSecondary, ...Typography.body },
    whatsappBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
    whatsappBtnText: { color: colors.background, ...Typography.h5, fontFamily: FontFamily.body700, fontWeight: FontWeight.bold },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    notFound: { color: colors.textSecondary, ...Typography.h5, marginBottom: 12 },
    backBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.surface },
    backBtnText: { color: colors.text, ...Typography.body },
  });
}
