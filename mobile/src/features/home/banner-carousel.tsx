import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { GuiaColors, CardColors, Overlays, Radius, Spacing, Type } from '@/constants/theme';
import type { DisplayBanner } from '@/data/mock';

export function BannerCarousel({ banners }: { banners: DisplayBanner[] }) {
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
          style={StyleSheet.flatten([
            styles.bannerCard,
            { backgroundColor: banner.color ?? CardColors.bannerPromo },
          ])}
          activeOpacity={0.85}
          onPress={() => openBanner(banner)}>
          <Text style={styles.bannerEmoji}>{banner.emoji}</Text>
          <Text style={styles.bannerTitle}>{banner.title}</Text>
          <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  carouselContent: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: Spacing.four,
  },
  bannerCard: {
    width: 260,
    height: 130,
    borderRadius: Radius.card,
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
    color: GuiaColors.text,
    fontSize: Type.section,
    fontWeight: '700',
  },
  bannerSubtitle: {
    color: Overlays.whiteMild,
    fontSize: Type.body,
  },
});
