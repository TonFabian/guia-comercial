import { SectionHeader } from './section-header';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GuiaColors, Radius, Spacing, Type } from '@/constants/theme';
import { openCompanyDetails } from '@/features/company/open-company';
import { companyId, companyLabel } from '@/types/domain';
import type { Job } from '@/types/domain';

export function JobList({ jobs }: { jobs: Job[] }) {
  return (
    <View style={styles.section}>
      <SectionHeader title="Oportunidades na Cidade" icon="briefcase" />
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
                  onPress={() => targetId && openCompanyDetails(targetId)}>
                  <Text style={styles.jobCompany}>{companyLabel(job.company)}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.jobButton}
                activeOpacity={0.7}
                onPress={() => Alert.alert(job.title, 'Detalhes da vaga em breve.')}>
                <Text style={styles.jobButtonText}>Ver Vaga</Text>
              </TouchableOpacity>
            </View>
          );
        })}
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
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
  },
  jobButtonText: {
    color: GuiaColors.background,
    fontSize: Type.body,
    fontWeight: '700',
  },
});
