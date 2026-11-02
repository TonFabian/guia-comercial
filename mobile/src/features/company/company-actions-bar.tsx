import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GuiaColors, Radius, Spacing, Type } from '@/constants/theme';

import type { CompanyAction, CompanyActionKind } from './company-actions';

const ICONS: Record<CompanyActionKind, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  whatsapp: 'whatsapp',
  call: 'phone-outline',
  map: 'map-marker-outline',
  website: 'web',
  instagram: 'instagram',
  facebook: 'facebook',
  share: 'share-variant-outline',
};

interface CompanyActionsBarProps {
  actions: CompanyAction[];
  onPress: (action: CompanyAction) => void;
}

/** Botões de contato e navegação da empresa. */
export function CompanyActionsBar({ actions, onPress }: CompanyActionsBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.kind}
          style={styles.button}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={() => onPress(action)}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons
              name={ICONS[action.kind]}
              size={20}
              color={GuiaColors.primary}
            />
          </View>
          <Text style={styles.label}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  button: {
    alignItems: 'center',
    width: 84,
    gap: 6,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.iconBox,
    backgroundColor: GuiaColors.surface,
    borderWidth: 1,
    borderColor: GuiaColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: GuiaColors.textSecondary,
    fontSize: Type.small,
    textAlign: 'center',
  },
});
