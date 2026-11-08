import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBackButton } from '@/components/top-back-button';
import { FontFamily, FontWeight, GuiaColors, Radius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useThemeMode } from '@/providers/theme-provider';
import { callPhone, openExternalUrl, openWhatsApp } from '@/utils/links';

const BENEFITS = [
  'Maior visibilidade para sua empresa na cidade',
  'Destaque em buscas e categorias do guia',
  'Divulgação de produtos, serviços e cupons',
  'Contato direto com clientes via WhatsApp',
  'Suporte dedicado para anunciantes',
];

const COMMERCIAL_PHONE = '(86) 99999-0000';
const COMMERCIAL_EMAIL = 'contato@guiacomercial.com';

export default function AnnounceScreen() {
  const colors = useThemeColors();
  const { mode } = useThemeMode();
  const styles = makeStyles(colors);

  return (
    <View style={styles.root}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <TopBackButton onPress={() => router.back()} />
            <Text style={styles.title}>Anuncie no Guia</Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.description}>
              Leve sua empresa para mais clientes da região. Anuncie no Guia Comercial e apareça
              para quem procura pelo que você oferece.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Benefícios</Text>
            {BENEFITS.map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Fale com a nossa equipe</Text>
            <TouchableOpacity
              style={[styles.contactButton, styles.whatsappButton]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Contato via WhatsApp"
              onPress={() =>
                void openWhatsApp(
                  COMMERCIAL_PHONE,
                  'Olá! Gostaria de anunciar minha empresa no *Guia Comercial*.',
                )
              }
            >
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
              <Text style={[styles.contactButtonText, styles.whatsappText]}>WhatsApp</Text>
              <Text style={[styles.contactButtonHint, styles.whatsappHint]}>
                {COMMERCIAL_PHONE}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactButton, styles.emailButton]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Contato via e-mail"
              onPress={() =>
                void openExternalUrl(
                  `mailto:${COMMERCIAL_EMAIL}?subject=${encodeURIComponent('Anunciar no Guia Comercial')}`,
                  'E-mail',
                )
              }
            >
              <Ionicons name="mail-outline" size={20} color={colors.text} />
              <Text style={styles.contactButtonText}>E-mail</Text>
              <Text style={styles.contactButtonHint}>{COMMERCIAL_EMAIL}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactButton, styles.phoneButton]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Ligar por telefone"
              onPress={() => void callPhone(COMMERCIAL_PHONE)}
            >
              <Ionicons name="call-outline" size={20} color={colors.text} />
              <Text style={styles.contactButtonText}>Telefone</Text>
              <Text style={styles.contactButtonHint}>{COMMERCIAL_PHONE}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.voltarButton}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={20}
            onPress={() => router.back()}
          >
            <Text style={styles.voltarText}>Voltar</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
    },
    content: {
      padding: Spacing.three,
      gap: Spacing.three,
      paddingBottom: Spacing.five,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 40,
      position: 'relative',
    },
    topButton: {
      width: 40,
      height: 40,
      borderRadius: Radius.pill,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      gap: Spacing.two,
    },
    title: {
      color: colors.text,
      ...Typography.h2,
      position: 'absolute',
      left: 0,
      right: 0,
      textAlign: 'center',
    },
    description: {
      color: colors.textSecondary,
      ...Typography.body,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.three,
      gap: Spacing.two,
    },
    sectionTitle: {
      color: colors.text,
      ...Typography.h5,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
    },
    benefitText: {
      color: colors.textSecondary,
      ...Typography.body,
      flex: 1,
    },
    contactButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.two,
      borderRadius: Radius.pill,
      paddingVertical: 12,
      paddingHorizontal: Spacing.three,
      borderWidth: 1,
      borderColor: colors.border,
    },
    whatsappButton: {
      backgroundColor: GuiaColors.whatsapp,
      borderColor: GuiaColors.whatsapp,
    },
    whatsappText: {
      color: '#FFFFFF',
    },
    whatsappHint: {
      color: 'rgba(255,255,255,0.85)',
    },
    emailButton: {
      backgroundColor: colors.surfaceAlt,
    },
    phoneButton: {
      backgroundColor: colors.surfaceAlt,
    },
    contactButtonText: {
      color: colors.text,
      ...Typography.body,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
      flex: 1,
    },
    contactButtonHint: {
      color: colors.textSecondary,
      ...Typography.caption,
    },
    voltarButton: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: Radius.pill,
      paddingVertical: 10,
      paddingHorizontal: Spacing.four,
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    voltarText: {
      color: colors.text,
      ...Typography.body,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
  });
}
