import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBackButton } from '@/components/top-back-button';
import { FontFamily, FontWeight, Overlays, Radius, Spacing, Typography } from '@/constants/theme';
import { openCompanyDetails } from '@/features/company/open-company';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useThemeMode } from '@/providers/theme-provider';
import { getJobById } from '@/services/api';
import type { Job } from '@/types/domain';
import { companyId, companyLabel } from '@/types/domain';

const JOB_TYPE_LABELS: Record<string, string> = {
  CLT: 'Tempo integral',
  'Part-time': 'Meio período',
};

function jobTypeLabel(type?: string) {
  if (!type) return 'Vaga';
  return JOB_TYPE_LABELS[type] ?? type;
}

export default function JobDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const colors = useThemeColors();
  const { mode } = useThemeMode();
  const styles = makeStyles(colors);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    (async () => {
      try {
        const found = await getJobById(jobId);
        if (cancelled) return;
        setJob(found);
      } catch {
        if (cancelled) return;
        setJob(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <Ionicons name="briefcase-outline" size={44} color={colors.textSecondary} />
        <Text style={styles.notFoundTitle}>Vaga não encontrada</Text>
        <Text style={styles.notFoundText}>
          O link pode estar errado ou a vaga foi removida do guia.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={20}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const companyTargetId = companyId(job.company);

  return (
    <View style={styles.root}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <TopBackButton onPress={() => router.back()} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>{job.title}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{jobTypeLabel(job.type)}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
              {companyTargetId ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver empresa ${companyLabel(job.company)}`}
                  onPress={() => openCompanyDetails(companyTargetId)}
                >
                  <Text style={styles.companyLink}>{companyLabel(job.company)}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.companyText}>{companyLabel(job.company)}</Text>
              )}
            </View>

            {job.location ? (
              <View style={styles.row}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.metaText}>{job.location}</Text>
              </View>
            ) : null}

            {job.description ? (
              <View style={styles.descriptionBlock}>
                <Text style={styles.sectionTitle}>Descrição</Text>
                <Text style={styles.description}>{job.description}</Text>
              </View>
            ) : null}

            {companyTargetId ? (
              <TouchableOpacity
                style={styles.verEmpresaButton}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Ver empresa"
                onPress={() => openCompanyDetails(companyTargetId)}
              >
                <Text style={styles.verEmpresaText}>Ver empresa</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.voltarButton}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={20}
            onPress={() => router.back()}
          >
            <Text style={styles.voltarText}>Voltar</Text>
          </TouchableOpacity>
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
    content: {
      padding: Spacing.three,
      gap: Spacing.three,
      paddingBottom: Spacing.five,
    },
    center: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: Spacing.four,
    },
    notFoundTitle: {
      color: colors.text,
      ...Typography.h4,
      fontFamily: FontFamily.heading700,
      fontWeight: FontWeight.bold,
    },
    notFoundText: {
      color: colors.textSecondary,
      ...Typography.body,
      textAlign: 'center',
    },
    backButton: {
      marginTop: Spacing.two,
      backgroundColor: colors.primary,
      borderRadius: Radius.pill,
      paddingVertical: 10,
      paddingHorizontal: Spacing.four,
    },
    backButtonText: {
      color: colors.background,
      ...Typography.body,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    topButton: {
      width: 40,
      height: 40,
      borderRadius: Radius.pill,
      backgroundColor: Overlays.blackSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      gap: Spacing.two,
    },
    title: {
      position: 'absolute',
      left: 0,
      right: 0,
      textAlign: 'center',
      color: colors.text,
      ...Typography.h2,
    },
    typeBadge: {
      alignSelf: 'flex-start',
      backgroundColor: Overlays.amberTag,
      borderRadius: Radius.tag,
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.one,
    },
    typeBadgeText: {
      color: colors.primary,
      ...Typography.caption,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.three,
      gap: Spacing.two,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    companyLink: {
      color: colors.primary,
      ...Typography.body,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
    },
    companyText: {
      color: colors.text,
      ...Typography.body,
    },
    metaText: {
      color: colors.textSecondary,
      ...Typography.body,
    },
    descriptionBlock: {
      gap: Spacing.one,
      marginTop: Spacing.one,
    },
    sectionTitle: {
      color: colors.text,
      ...Typography.h5,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    description: {
      color: colors.textSoft,
      ...Typography.body,
    },
    verEmpresaButton: {
      marginTop: Spacing.two,
      backgroundColor: colors.primary,
      borderRadius: Radius.pill,
      paddingVertical: 10,
      paddingHorizontal: Spacing.four,
      alignSelf: 'flex-start',
    },
    verEmpresaText: {
      color: colors.background,
      ...Typography.body,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    voltarButton: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radius.pill,
      paddingVertical: 10,
      paddingHorizontal: Spacing.four,
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    voltarText: {
      color: colors.text,
      ...Typography.body,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
  });
}
