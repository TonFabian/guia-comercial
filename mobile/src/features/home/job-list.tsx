import { SectionHeader } from './section-header';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GuiaColors, Radius, Spacing, Type } from '@/constants/theme';
import { companyLabel } from '@/types/domain';
import type { Job } from '@/types/domain';

export function JobList({ jobs }: { jobs: Job[] }) {
  return (
    <View style={styles.section}>
      <SectionHeader title="Oportunidades na Cidade" icon="briefcase" />
      <View style={styles.jobsList}>
        {jobs.map((job) => (
          <View key={job._id} style={styles.jobItem}>
            <View style={styles.jobInfo}>
              <Text style={styles.jobRole}>{job.title}</Text>
              <Text style={styles.jobCompany}>{companyLabel(job.company)}</Text>
            </View>
            <TouchableOpacity
              style={styles.jobButton}
              activeOpacity={0.8}
              onPress={() => Alert.alert(job.title, 'Detalhes da vaga em breve.')}>
              <Text style={styles.jobButtonText}>Ver Vaga</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.four,
  },
  jobsList: {
    marginHorizontal: 16,
    backgroundColor: GuiaColors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    overflow: 'hidden',
  },
  jobItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GuiaColors.border,
    gap: 12,
  },
  jobInfo: {
    flex: 1,
    gap: 2,
  },
  jobRole: {
    color: GuiaColors.text,
    fontSize: Type.subtitle,
    fontWeight: '600',
  },
  jobCompany: {
    color: GuiaColors.textSecondary,
    fontSize: Type.body,
  },
  jobButton: {
    backgroundColor: GuiaColors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  jobButtonText: {
    color: GuiaColors.background,
    fontSize: Type.body,
    fontWeight: '700',
  },
});
