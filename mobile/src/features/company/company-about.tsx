import { StyleSheet, Text, View } from 'react-native';

import { Radius, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface CompanyAboutProps {
  description: string;
  services?: string[];
  address?: string;
  city?: string;
}

/** Descrição, serviços ofertados e endereço da empresa. */
export function CompanyAbout({ description, services, address, city }: CompanyAboutProps) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

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

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    description: {
      color: colors.text,
      fontSize: Type.base,
      lineHeight: 21,
    },
    addressRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    addressLabel: {
      color: colors.textSecondary,
      fontSize: Type.body,
    },
    addressValue: {
      color: colors.text,
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
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radius.chip,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    serviceText: {
      color: colors.text,
      fontSize: Type.small,
    },
  });
}
