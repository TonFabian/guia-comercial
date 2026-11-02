import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SectionHeader } from './section-header';

import { Overlays, Radius, Spacing, Type } from '@/constants/theme';
import { CONTACT_HIDDEN_HINT, ContactHintRow } from '@/features/home/contact-hidden-hint';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { Company } from '@/types/domain';
import { categoryLabel } from '@/types/domain';
import { callPhone, openAddress, openWhatsApp } from '@/utils/links';
import { openCompanyDetails } from '../company/open-company';

export function FeaturedCompany({ company }: { company: Company | null }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  if (!company) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Empresas em Destaque" />
      <View style={styles.companyCard}>
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Ver detalhes de ${company.name}`}
          onPress={() => openCompanyDetails(company._id)}
        >
          <View style={styles.companyCover}>
            <MaterialCommunityIcons name="office-building" size={48} color={Overlays.whiteSoft} />
            <View style={styles.highlightTag}>
              <Text style={styles.highlightTagText}>Destaque</Text>
            </View>
          </View>
          <View style={styles.companyBody}>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.companyCategory}>{categoryLabel(company.category)}</Text>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.companyAddress}>{company.address}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.companyActions}>
          <TouchableOpacity
            style={styles.actionPill}
            activeOpacity={0.7}
            onPress={() => company.phone && void callPhone(company.phone)}
            disabled={!company.phone}
            accessibilityLabel={!company.phone ? 'Telefone não disponível' : 'Ligar'}
          >
            <Ionicons name="call-outline" size={16} color={colors.primary} />
            <Text style={styles.actionPillText}>Ligar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionPill}
            activeOpacity={0.7}
            onPress={() => company.address && void openAddress(company.address)}
            disabled={!company.address}
            accessibilityLabel={!company.address ? 'Endereço não disponível' : 'Abrir endereço'}
          >
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            <Text style={styles.actionPillText}>Endereço</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.whatsappPill}
            activeOpacity={0.7}
            onPress={() => company.whatsapp && void openWhatsApp(company.whatsapp)}
            disabled={!company.whatsapp}
            accessibilityLabel={!company.whatsapp ? 'WhatsApp não disponível' : 'Abrir WhatsApp'}
          >
            <MaterialCommunityIcons name="whatsapp" size={16} color={colors.background} />
            <Text style={styles.whatsappPillText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.companyBody}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyCategory}>{categoryLabel(company.category)}</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.companyAddress}>{company.address ?? CONTACT_HIDDEN_HINT}</Text>
          </View>
          <View style={styles.companyActions}>
            {company.phone ? (
              <TouchableOpacity
                style={styles.actionPill}
                activeOpacity={0.7}
                onPress={(event) => {
                  event.stopPropagation();
                  if (company.phone) void callPhone(company.phone);
                }}
              >
                <Ionicons name="call-outline" size={16} color={colors.primary} />
                <Text style={styles.actionPillText}>Ligar</Text>
              </TouchableOpacity>
            ) : null}
            {company.address ? (
              <TouchableOpacity
                style={styles.actionPill}
                activeOpacity={0.7}
                onPress={(event) => {
                  event.stopPropagation();
                  if (company.address) void openAddress(company.address);
                }}
              >
                <Ionicons name="location-outline" size={16} color={colors.primary} />
                <Text style={styles.actionPillText}>Endereço</Text>
              </TouchableOpacity>
            ) : null}
            {company.whatsapp ? (
              <TouchableOpacity
                style={styles.whatsappPill}
                activeOpacity={0.7}
                onPress={(event) => {
                  event.stopPropagation();
                  if (company.whatsapp) void openWhatsApp(company.whatsapp);
                }}
              >
                <MaterialCommunityIcons name="whatsapp" size={16} color={colors.background} />
                <Text style={styles.whatsappPillText}>WhatsApp</Text>
              </TouchableOpacity>
            ) : null}
            {!company.phone && !company.address && !company.whatsapp ? <ContactHintRow /> : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    section: {
      marginBottom: 24,
    },
    companyCard: {
      marginHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    cardPressed: {
      opacity: 0.88,
    },
    companyCover: {
      height: 120,
      backgroundColor: colors.coverPlaceholder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    highlightTag: {
      position: 'absolute',
      top: 12,
      left: 12,
      backgroundColor: colors.primary,
      borderRadius: Radius.chip,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    highlightTagText: {
      color: colors.background,
      fontSize: Type.small,
      fontWeight: '800',
    },
    companyBody: {
      padding: 16,
      gap: 6,
    },
    companyName: {
      color: colors.text,
      fontSize: Type.section,
      fontWeight: '700',
    },
    companyCategory: {
      color: colors.textSecondary,
      fontSize: Type.body,
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    companyAddress: {
      color: colors.textSecondary,
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
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radius.pill,
      paddingVertical: 10,
      paddingHorizontal: Spacing.three,
    },
    actionPillText: {
      color: colors.primary,
      fontSize: Type.body,
      fontWeight: '600',
    },
    whatsappPill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.whatsapp,
      borderRadius: Radius.pill,
      paddingVertical: 10,
      paddingHorizontal: Spacing.three,
    },
    whatsappPillText: {
      color: colors.background,
      fontSize: Type.body,
      fontWeight: '700',
    },
  });
}
