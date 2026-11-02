import {
  Alert,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Overlays, Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Job } from '@/types/domain';
import { companyId, companyLabel } from '@/types/domain';
import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { openCompanyDetails } from '../company/open-company';
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
      accessibilityLabel={`Ver detalhes da vaga de ${job.title}`}
    >
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
      <View style={styles.jobsList}>
        {jobs.map((job) => {
          const targetId = companyId(job.company);
          return (
            <View key={job._id} style={styles.jobItem}>
              <View style={styles.jobInfo}>
                <Text style={styles.jobRole}>{job.title}</Text>
                <TouchableOpacity
                  disabled={!targetId}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver empresa ${companyLabel(job.company)}`}
                  onPress={() => targetId && openCompanyDetails(targetId)}
                >
                  <Text style={styles.jobCompany}>{companyLabel(job.company)}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.jobButton}
                activeOpacity={0.7}
                onPress={() => Alert.alert(job.title, 'Detalhes da vaga em breve.')}
              >
                <Text style={styles.jobButtonText}>Ver Vaga</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
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
    jobsList: {
      marginHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    jobItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 12,
    },
    jobInfo: {
      flex: 1,
      gap: 2,
    },
    jobRole: {
      color: colors.text,
      fontSize: Type.cardTitle,
      fontWeight: '700',
      lineHeight: 20,
    },
    jobCompany: {
      color: colors.textSecondary,
      fontSize: Type.body,
    },
    jobButton: {
      backgroundColor: colors.primary,
      borderRadius: Radius.pill,
      paddingVertical: 10,
      paddingHorizontal: Spacing.three,
    },
    jobButtonText: {
      color: colors.background,
      fontSize: Type.body,
      fontWeight: '700',
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
