import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import type { ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardShadow, Radius, Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { SectionHeader } from '@/features/home/section-header';
import { openVideo } from '@/utils/links';

import type { CompanyMedia } from './company-details';

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type GalleryMedia = CompanyMedia & {
  source?: ImageSource | number;
  label?: string;
  icon?: MaterialIconName;
};

const PREVIEW_MEDIA_LIMIT = 4;
const PREVIEW_CARD_WIDTH = 220;
const PREVIEW_CARD_HEIGHT = 150;
const GRID_COLUMNS = 3;
const GRID_GAP = 8;
const GRID_PADDING = 16;

const GALLERY_PLACEHOLDERS: GalleryMedia[] = [
  {
    key: 'placeholder-estrutura',
    type: 'image',
    url: '',
    label: 'Estrutura',
    icon: 'office-building',
  },
  {
    key: 'placeholder-atendimento',
    type: 'image',
    url: '',
    label: 'Atendimento',
    icon: 'account-group-outline',
  },
  {
    key: 'placeholder-servicos',
    type: 'image',
    url: '',
    label: 'Serviços',
    icon: 'tools',
  },
];

function sourceFor(media: GalleryMedia): ImageSource | number | null {
  if (media.source) return media.source;

  const uri = media.thumbnailUrl ?? media.url;
  return uri ? { uri } : null;
}

function labelFor(media: GalleryMedia): string {
  return media.label ?? (media.type === 'video' ? 'Vídeo' : 'Foto da empresa');
}

function placeholderIconFor(media: GalleryMedia): MaterialIconName {
  if (media.icon) return media.icon;
  return media.type === 'video' ? 'play-circle-outline' : 'image-outline';
}

function mediaKey(item: GalleryMedia) {
  return item.key;
}

const PreviewCard = memo(function PreviewCard({
  item,
  index,
  onPress,
  colors,
}: {
  item: GalleryMedia;
  index: number;
  onPress: (index: number) => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const styles = makeStyles(colors);
  const source = sourceFor(item);

  return (
    <Pressable
      style={({ pressed }) => [styles.previewCard, pressed && styles.pressed]}
      onPress={() => onPress(index)}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${labelFor(item)}`}>
      {source ? (
        <Image
          source={source}
          style={styles.previewImage}
          contentFit="cover"
          transition={200}
          accessibilityLabel={labelFor(item)}
        />
      ) : (
        <LinearGradient
          colors={[colors.surfaceAlt, colors.surface]}
          style={styles.placeholder}>
          <MaterialCommunityIcons
            name={placeholderIconFor(item)}
            size={30}
            color={colors.primary}
          />
          <Text style={styles.placeholderText}>{labelFor(item)}</Text>
        </LinearGradient>
      )}

      {item.type === 'video' ? (
        <View style={styles.playBadge}>
          <Ionicons name="play" size={20} color={colors.background} />
        </View>
      ) : null}
    </Pressable>
  );
});

const GridCard = memo(function GridCard({
  item,
  index,
  size,
  onPress,
  colors,
}: {
  item: GalleryMedia;
  index: number;
  size: number;
  onPress: (index: number) => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const styles = makeStyles(colors);
  const source = sourceFor(item);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.gridCard,
        { width: size, height: size },
        pressed && styles.pressed,
      ]}
      onPress={() => onPress(index)}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${labelFor(item)}`}>
      {source ? (
        <Image
          source={source}
          style={styles.gridImage}
          contentFit="cover"
          transition={150}
          accessibilityLabel={labelFor(item)}
        />
      ) : (
        <LinearGradient
          colors={[colors.surfaceAlt, colors.surface]}
          style={styles.placeholder}>
          <MaterialCommunityIcons
            name={placeholderIconFor(item)}
            size={26}
            color={colors.primary}
          />
          <Text style={styles.gridPlaceholderText} numberOfLines={1}>
            {labelFor(item)}
          </Text>
        </LinearGradient>
      )}

      {item.type === 'video' ? (
        <View style={styles.gridPlayBadge}>
          <Ionicons name="play" size={14} color={colors.background} />
        </View>
      ) : null}
    </Pressable>
  );
});

export function CompanyGallery({ media }: { media: CompanyMedia[] }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const mediaItems = useMemo<GalleryMedia[]>(
    () => (media.length > 0 ? media : GALLERY_PLACEHOLDERS),
    [media],
  );
  const previewMedia = useMemo(
    () => mediaItems.slice(0, PREVIEW_MEDIA_LIMIT),
    [mediaItems],
  );

  const gridWidth = Math.min(width, 680);
  const gridItemSize = Math.floor(
    (gridWidth - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
  );

  const activeMedia = activeIndex === null ? null : (mediaItems[activeIndex] ?? null);
  const activeSource = activeMedia ? sourceFor(activeMedia) : null;
  const activePosition = activeIndex ?? 0;
  const isFirstMedia = activePosition === 0;
  const isLastMedia = activePosition === mediaItems.length - 1;

  const openLightbox = useCallback((index: number) => {
    setActiveIndex(index);
    setGalleryVisible(true);
  }, []);

  const openGallery = useCallback(() => {
    setActiveIndex(null);
    setGalleryVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setActiveIndex(null);
    setGalleryVisible(false);
  }, []);

  const handleRequestClose = useCallback(() => {
    if (activeIndex !== null) {
      setActiveIndex(null);
      return;
    }

    setGalleryVisible(false);
  }, [activeIndex]);

  const goToPrevious = useCallback(() => {
    setActiveIndex((index) => (index === null ? null : Math.max(0, index - 1)));
  }, []);

  const goToNext = useCallback(() => {
    setActiveIndex((index) => {
      if (index === null) return null;
      return Math.min(mediaItems.length - 1, index + 1);
    });
  }, [mediaItems.length]);

  const renderPreviewItem = useCallback(
    ({ item, index }: ListRenderItemInfo<GalleryMedia>) => (
      <PreviewCard item={item} index={index} onPress={openLightbox} colors={colors} />
    ),
    [openLightbox, colors],
  );

  const renderGridItem = useCallback(
    ({ item, index }: ListRenderItemInfo<GalleryMedia>) => (
      <GridCard item={item} index={index} size={gridItemSize} onPress={openLightbox} colors={colors} />
    ),
    [gridItemSize, openLightbox, colors],
  );

  if (mediaItems.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Galeria de Mídia"
        actionLabel={`Ver todas (+${mediaItems.length})`}
        onAction={openGallery}
      />

      <FlatList
        horizontal
        data={previewMedia}
        keyExtractor={mediaKey}
        renderItem={renderPreviewItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.previewList}
        snapToInterval={PREVIEW_CARD_WIDTH + 12}
        decelerationRate="fast"
      />

      <Modal
        visible={galleryVisible}
        animationType="slide"
        onRequestClose={handleRequestClose}
        statusBarTranslucent>
        <View style={styles.modalRoot}>
          {activeMedia ? (
            <View
              style={[
                styles.lightbox,
                {
                  paddingTop: insets.top + Spacing.two,
                  paddingBottom: Math.max(insets.bottom, Spacing.three),
                },
              ]}>
              <View style={styles.lightboxHeader}>
                <Pressable
                  style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}
                  onPress={() => setActiveIndex(null)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar mídia">
                  <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>

                <Text style={styles.lightboxCounter}>
                  {activePosition + 1} / {mediaItems.length}
                </Text>

                <View style={styles.lightboxHeaderSpacer} />
              </View>

              <View style={styles.lightboxBody}>
                {activeSource ? (
                  <Image
                    source={activeSource}
                    style={styles.lightboxImage}
                    contentFit="contain"
                    transition={200}
                    accessibilityLabel={labelFor(activeMedia)}
                  />
                ) : (
                  <LinearGradient
                    colors={[colors.surfaceAlt, colors.background]}
                    style={styles.lightboxPlaceholder}>
                    <MaterialCommunityIcons
                      name={placeholderIconFor(activeMedia)}
                      size={52}
                      color={colors.primary}
                    />
                    <Text style={styles.lightboxPlaceholderTitle}>
                      {labelFor(activeMedia)}
                    </Text>
                    <Text style={styles.lightboxPlaceholderText}>Mídia indisponível.</Text>
                  </LinearGradient>
                )}

                {activeMedia.type === 'video' ? (
                  <Pressable
                    style={({ pressed }) => [styles.lightboxPlay, pressed && styles.pressed]}
                    onPress={() => {
                      if (activeMedia.url) void openVideo(activeMedia.url);
                    }}
                    disabled={!activeMedia.url}
                    accessibilityRole="button"
                    accessibilityLabel="Reproduzir vídeo"
                    accessibilityState={{ disabled: !activeMedia.url }}>
                    <Ionicons name="play" size={30} color={colors.background} />
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.lightboxFooter}>
                <Pressable
                  style={({ pressed }) => [
                    styles.lightboxNavButton,
                    isFirstMedia && styles.lightboxNavDisabled,
                    pressed && !isFirstMedia ? styles.pressed : null,
                  ]}
                  onPress={goToPrevious}
                  disabled={isFirstMedia}
                  accessibilityRole="button"
                  accessibilityLabel="Mídia anterior"
                  accessibilityState={{ disabled: isFirstMedia }}>
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color={isFirstMedia ? colors.textSecondary : colors.text}
                  />
                </Pressable>

                <Text style={styles.lightboxCaption} numberOfLines={1}>
                  {labelFor(activeMedia)}
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.lightboxNavButton,
                    isLastMedia && styles.lightboxNavDisabled,
                    pressed && !isLastMedia ? styles.pressed : null,
                  ]}
                  onPress={goToNext}
                  disabled={isLastMedia}
                  accessibilityRole="button"
                  accessibilityLabel="Próxima mídia"
                  accessibilityState={{ disabled: isLastMedia }}>
                  <Ionicons
                    name="chevron-forward"
                    size={22}
                    color={isLastMedia ? colors.textSecondary : colors.text}
                  />
                </Pressable>
              </View>
            </View>
          ) : (
            <View
              style={[styles.modalContent, { paddingTop: insets.top + Spacing.three }]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleGroup}>
                  <Text style={styles.modalTitle}>Galeria de Mídia</Text>
                  <Text style={styles.modalSubtitle}>
                    {mediaItems.length} mídias disponíveis
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}
                  onPress={closeModal}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar galeria">
                  <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>
              </View>

              <FlatList
                data={mediaItems}
                keyExtractor={mediaKey}
                renderItem={renderGridItem}
                numColumns={GRID_COLUMNS}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={styles.gridContent}
                style={[styles.gridList, { width: gridWidth }]}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  section: {
    marginBottom: Spacing.four,
  },
  previewList: {
    paddingHorizontal: Spacing.three,
    gap: 12,
  },
  previewCard: {
    ...CardShadow,
    width: PREVIEW_CARD_WIDTH,
    height: PREVIEW_CARD_HEIGHT,
    borderRadius: Radius.detailCard,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  previewImage: {
    flex: 1,
    borderRadius: Radius.detailCard,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.detailCard,
  },
  placeholderText: {
    color: colors.textSecondary,
        ...Typography.caption,
    fontFamily: FontFamily.body600,
    fontWeight: FontWeight.semibold,
  },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 42,
    height: 42,
    marginTop: -21,
    marginLeft: -21,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  gridCard: {
    borderRadius: Radius.detailCard,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  gridImage: {
    flex: 1,
    borderRadius: Radius.detailCard,
  },
  gridPlaceholderText: {
    color: colors.textSecondary,
        ...Typography.caption,
    fontFamily: FontFamily.body600,
    fontWeight: FontWeight.semibold,
    paddingHorizontal: Spacing.one,
  },
  gridPlayBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  modalTitleGroup: {
    flex: 1,
    gap: 2,
  },
  modalTitle: {
    color: colors.text,
        ...Typography.h2,
    fontFamily: FontFamily.heading800,
    fontWeight: FontWeight.heavy,
  },
  modalSubtitle: {
    color: colors.textSecondary,
    ...Typography.caption,
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridList: {
    alignSelf: 'center',
  },
  gridContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  lightbox: {
    flex: 1,
    backgroundColor: colors.background,
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  lightboxCounter: {
    color: colors.textSecondary,
        ...Typography.caption,
    fontFamily: FontFamily.body700,
    fontWeight: FontWeight.bold,
  },
  lightboxHeaderSpacer: {
    width: 40,
    height: 40,
  },
  lightboxBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.card,
  },
  lightboxPlaceholderTitle: {
    color: colors.text,
        ...Typography.h5,
    fontFamily: FontFamily.body700,
    fontWeight: FontWeight.bold,
  },
  lightboxPlaceholderText: {
    color: colors.textSecondary,
    ...Typography.caption,
  },
  lightboxPlay: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  lightboxFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  lightboxCaption: {
    flex: 1,
    color: colors.textSecondary,
        ...Typography.caption,
    fontFamily: FontFamily.body600,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  lightboxNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lightboxNavDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
});
}
