import { useCallback, useState } from 'react';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

import { pageIndexFromOffset } from '@/utils/carousel-page';

export function useCarouselPagination(length: number, itemWidth: number, spacing: number) {
  const [activeIndex, setActiveIndex] = useState(0);
  const snapToInterval = itemWidth + spacing;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      setActiveIndex(
        pageIndexFromOffset(
          contentOffset.x,
          snapToInterval,
          length,
          contentSize.width - layoutMeasurement.width,
        ),
      );
    },
    [length, snapToInterval],
  );

  return { activeIndex, handleScroll, snapToInterval };
}