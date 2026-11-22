import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { PaginationDots } from '@/components/PaginationDots';
import { CardColors, CardShadow, Overlays, Radius, Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { DisplayBanner } from '@/data/mock';
import { pageIndexFromOffset } from '@/utils/carousel-page';

const BANNER_CARD_WIDTH = 260;
const BANNER_GAP = 12;

const GRADIENT_START = { x: 0, y: 0 } as const;
const GRADIENT_END = { x: 1, y: 1 } as const;

export function BannerCarousel({ banners }: { banners: DisplayBanner[] }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      setActiveIndex(
        pageIndexFromOffset(
          contentOffset.x,
          BANNER_CARD_WIDTH + BANNER_GAP * 2,
          banners.length,
          contentSize.width - layoutMeasurement.width,
        ),
      );
    },
    [banners.length],
  );

  function openBanner(banner: DisplayBanner) {
    if (!banner.link) return;
    void Linking.openURL(banner.link).catch(() => undefined);
  }

  return (
    <View style={styles.section}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
        snapToInterval={BANNER_CARD_WIDTH + BANNER_GAP * 2}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}>
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
      <PaginationDots total={banners.length} activeIndex={activeIndex} />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    section: {
      marginBottom: Spacing.four,
    },
    carouselContent: {
      paddingHorizontal: 16,
      gap: BANNER_GAP,
    },
    bannerCard: {
      width: BANNER_CARD_WIDTH,
      height: 130,
      borderRadius: Radius.cardLarge,
      marginRight: BANNER_GAP,
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
      ...Typography.h1,
      position: 'absolute',
      top: 12,
      right: 14,
    },
    bannerTitle: {
      color: colors.text,
            ...Typography.h5,
      fontFamily: FontFamily.body700,
      fontWeight: FontWeight.bold,
    },
    bannerSubtitle: {
      color: Overlays.whiteMild,
      ...Typography.body,
    },
  });
}