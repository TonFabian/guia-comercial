import { StyleSheet, Text, View } from 'react-native';

import { GuiaColors, Radius, Type } from '@/constants/theme';

interface CompanyAboutProps {
  description: string;
  services?: string[];
  address?: string;
  city?: string;
}

/** Descrição, serviços ofertados e endereço da empresa. */
export function CompanyAbout({ description, services, address, city }: CompanyAboutProps) {
  return (
    <>
      <Text style={styles.description}>{description}</Text>

      {address && (
        <View style={styles.addressRow}>
          <Text style={styles.addressLabel}>Endereço:</Text>
          <Text style={styles.addressValue}>{[address, city].filter(Boolean).join(' — ')}</Text>
        </View>
      )}

      {services && services.length > 0 && (
        <View style={styles.services}>
          {services.map((service) => (
            <View key={service} style={styles.serviceChip}>
              <Text style={styles.serviceText}>{service}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  description: {
    color: GuiaColors.text,
    fontSize: Type.base,
    lineHeight: 21,
  },
  addressRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  addressLabel: {
    color: GuiaColors.textSecondary,
    fontSize: Type.body,
  },
  addressValue: {
    color: GuiaColors.text,
    fontSize: Type.body,
    flexShrink: 1,
  },
  services: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  serviceChip: {
    backgroundColor: GuiaColors.surfaceAlt,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  serviceText: {
    color: GuiaColors.text,
    fontSize: Type.small,
  },
});
