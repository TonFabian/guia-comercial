import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';

import { Glass, Overlays, Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { companyLabel } from '@/types/domain';
import type { Job } from '@/types/domain';
import { SectionHeader } from './section-header';

const JOB_TYPE_LABELS: Record<string, string> = {
  CLT: 'Tempo integral',
  'Part-time': 'Meio período',
};

function jobTypeLabel(type?: string) {
  if (!type) return 'Vaga';
  return JOB_TYPE_LABELS[type] ?? type;
}

function openJob(job: Job) {
  Alert.alert(job.title, 'Detalhes da vaga em breve.');
}

const JobCard = memo(function JobCard({ job }: { job: Job }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <Pressable
      style={({ pressed }) => [styles.jobCard, pressed && styles.jobCardPressed]}
      onPress={() => openJob(job)}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalhes da vaga de ${job.title}`}>
      <View style={styles.jobCardTop}>
        <View style={styles.jobTypeBadge}>
          <Text style={styles.jobTypeText}>{jobTypeLabel(job.type)}</Text>
        </View>
        <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
      </View>

      <View style={styles.jobCardBody}>
        <Text style={styles.jobRole} numberOfLines={2}>
          {job.title}
        </Text>

        <View style={styles.jobMetaRow}>
          <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.jobMetaText} numberOfLines={1}>
            {companyLabel(job.company)}
          </Text>
        </View>

        {job.location ? (
          <View style={styles.jobMetaRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.jobMetaText} numberOfLines={1}>
              {job.location}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.jobDetailsButton}>
        <Text style={styles.jobDetailsText}>Ver detalhes</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </View>
    </Pressable>
  );
});

function jobKey(job: Job) {
  return job._id;
}

const renderJob = ({ item }: ListRenderItemInfo<Job>) => <JobCard job={item} />;

export function JobList({ jobs }: { jobs: Job[] }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  if (jobs.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Oportunidades na Cidade" />
      <FlatList
        horizontal
        data={jobs}
        keyExtractor={jobKey}
        renderItem={renderJob}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.jobsContent}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    section: {
      marginBottom: Spacing.four,
    },
    jobsContent: {
      paddingHorizontal: Spacing.three,
      gap: 12,
    },
    jobCard: {
      width: 232,
      minHeight: 184,
      justifyContent: 'space-between',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.three,
    },
    jobCardPressed: {
      opacity: 0.86,
      borderColor: Overlays.amberGlow,
    },
    jobCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    jobTypeBadge: {
      backgroundColor: Overlays.amberTag,
      borderRadius: Radius.tag,
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.one,
    },
    jobTypeText: {
      color: colors.primary,
      fontSize: Type.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    jobCardBody: {
      flex: 1,
      gap: Spacing.two,
    },
    jobRole: {
      color: colors.text,
      fontSize: Type.cardTitle,
      fontWeight: '700',
      lineHeight: 20,
    },
    jobMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.one + Spacing.half,
    },
    jobMetaText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: Type.small,
    },
    jobDetailsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: Spacing.one,
      backgroundColor: Overlays.amberGlow,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: Spacing.two,
    },
    jobDetailsText: {
      color: colors.primary,
      fontSize: Type.small,
      fontWeight: '700',
    },
  });
}