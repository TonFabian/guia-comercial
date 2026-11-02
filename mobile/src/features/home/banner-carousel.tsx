import { LinearGradient } from 'expo-linear-gradient';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import {
  CardColors,
  CardShadow,
  Overlays,
  Radius,
  Spacing,
  Type,
} from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { DisplayBanner } from '@/data/mock';

const GRADIENT_START = { x: 0, y: 0 } as const;
const GRADIENT_END = { x: 1, y: 1 } as const;

export function BannerCarousel({ banners }: { banners: DisplayBanner[] }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  function openBanner(banner: DisplayBanner) {
    if (!banner.link) return;
    void Linking.openURL(banner.link).catch(() => undefined);
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carouselContent}>
      {banners.map((banner) => (
        <TouchableOpacity
          key={banner._id}
          style={styles.bannerCard}
          activeOpacity={0.85}
          onPress={() => openBanner(banner)}>
          <LinearGradient
            colors={[colors.background, banner.color ?? CardColors.bannerPromo]}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={styles.bannerGradient}>
            <Text style={styles.bannerEmoji}>{banner.emoji}</Text>
            <Text style={styles.bannerTitle}>{banner.title}</Text>
            <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    carouselContent: {
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: Spacing.four,
    },
    bannerCard: {
      width: 260,
      height: 130,
      borderRadius: Radius.cardLarge,
      marginRight: 12,
      ...CardShadow,
    },
    bannerGradient: {
      flex: 1,
      borderRadius: Radius.cardLarge,
      padding: Spacing.three,
      justifyContent: 'flex-end',
      gap: Spacing.one,
    },
    bannerEmoji: {
      fontSize: 28,
      position: 'absolute',
      top: 12,
      right: 14,
    },
    bannerTitle: {
      color: colors.text,
      fontSize: Type.section,
      fontWeight: '700',
    },
    bannerSubtitle: {
      color: Overlays.whiteMild,
      fontSize: Type.body,
    },
  });
}