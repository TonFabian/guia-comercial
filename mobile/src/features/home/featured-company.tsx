import { SectionHeader } from './section-header';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GuiaColors, Overlays, Radius, Spacing, Type } from '@/constants/theme';
import { ContactHintRow, CONTACT_HIDDEN_HINT } from '@/features/home/contact-hidden-hint';
import { categoryLabel } from '@/types/domain';
import type { Company } from '@/types/domain';
import { callPhone, openAddress, openWhatsApp } from '@/utils/links';

export function FeaturedCompany({ company }: { company: Company | null }) {
  if (!company) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Empresas em Destaque" icon="star" />
      <View style={styles.companyCard}>
        <View style={styles.companyCover}>
          <MaterialCommunityIcons
            name="office-building"
            size={48}
            color={Overlays.whiteSoft}
          />
          <View style={styles.highlightTag}>
            <Text style={styles.highlightTagText}>Destaque</Text>
          </View>
        </View>
        <View style={styles.companyBody}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyCategory}>{categoryLabel(company.category)}</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color={GuiaColors.textSecondary} />
            <Text style={styles.companyAddress}>{company.address ?? CONTACT_HIDDEN_HINT}</Text>
          </View>
          <View style={styles.companyActions}>
            {/* Atalhos presentes só com o dado; sem nenhum, o hint. */}
            {company.phone ? (
              <TouchableOpacity
                style={styles.actionPill}
                activeOpacity={0.7}
                onPress={() => company.phone && void callPhone(company.phone)}>
                <Ionicons name="call-outline" size={16} color={GuiaColors.primary} />
                <Text style={styles.actionPillText}>Ligar</Text>
              </TouchableOpacity>
            ) : null}
            {company.address ? (
              <TouchableOpacity
                style={styles.actionPill}
                activeOpacity={0.7}
                onPress={() => company.address && void openAddress(company.address)}>
                <Ionicons name="location-outline" size={16} color={GuiaColors.primary} />
                <Text style={styles.actionPillText}>Endereço</Text>
              </TouchableOpacity>
            ) : null}
            {company.whatsapp ? (
              <TouchableOpacity
                style={styles.whatsappPill}
                activeOpacity={0.7}
                onPress={() => company.whatsapp && void openWhatsApp(company.whatsapp)}>
                <MaterialCommunityIcons name="whatsapp" size={16} color={GuiaColors.background} />
                <Text style={styles.whatsappPillText}>WhatsApp</Text>
              </TouchableOpacity>
            ) : null}
            {!company.phone && !company.address && !company.whatsapp ? (
              <ContactHintRow />
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  companyCard: {
    marginHorizontal: 16,
    backgroundColor: GuiaColors.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    overflow: 'hidden',
  },
  companyCover: {
    height: 120,
    backgroundColor: GuiaColors.coverPlaceholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: GuiaColors.primary,
    borderRadius: Radius.chip,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  highlightTagText: {
    color: GuiaColors.background,
    fontSize: Type.small,
    fontWeight: '800',
  },
  companyBody: {
    padding: 16,
    gap: 6,
  },
  companyName: {
    color: GuiaColors.text,
    fontSize: Type.section,
    fontWeight: '700',
  },
  companyCategory: {
    color: GuiaColors.textSecondary,
    fontSize: Type.body,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  companyAddress: {
    color: GuiaColors.textSecondary,
    fontSize: Type.body,
  },
  companyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: GuiaColors.surfaceAlt,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
  },
  actionPillText: {
    color: GuiaColors.primary,
    fontSize: Type.body,
    fontWeight: '600',
  },
  whatsappPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: GuiaColors.whatsapp,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
  },
  whatsappPillText: {
    color: GuiaColors.background,
    fontSize: Type.body,
    fontWeight: '700',
  },
});
