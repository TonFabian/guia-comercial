import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { AutonomousProfessional } from '@/types/domain';
import { SectionHeader } from './section-header';

export function AutonomousProfessionals({ professionals }: { professionals: AutonomousProfessional[] }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  if (professionals.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Profissionais Independentes" />
      <View style={styles.list}>
        {professionals.map((p, idx) => (
          <TouchableOpacity
            key={p._id ?? idx}
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/autonomous/${p._id}`)}
          >
            <View style={styles.avatar}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
            <View style={styles.body}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.specialty}>{p.specialty}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    section: { marginBottom: Spacing.four },
    list: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, gap: 2 },
    name: { color: colors.text, fontSize: Type.subtitle, fontWeight: '600' },
    specialty: { color: colors.textSecondary, fontSize: Type.small },
  });
}