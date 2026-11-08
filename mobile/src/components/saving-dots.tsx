import { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';

import { Typography, FontFamily, FontWeight } from '@/constants/theme';

/**
 * Texto "Salvando" com efeito de pontos animados (DotsLoading).
 */
export function SavingDots({ color }: { color: string }) {
  const [dots] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dots, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(dots, { toValue: 0, duration: 400, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [dots]);

  const opacity1 = dots.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0.3, 1, 0.3, 0.3] });
  const opacity2 = dots.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0.3, 0.3, 1, 0.3] });
  const opacity3 = dots.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0.3, 0.3, 0.3, 1] });

  return (
    <Text style={{ color, ...Typography.body, fontFamily: FontFamily.body600, fontWeight: FontWeight.semibold }}>
      Salvando
      <Animated.Text style={{ opacity: opacity1 }}>.</Animated.Text>
      <Animated.Text style={{ opacity: opacity2 }}>.</Animated.Text>
      <Animated.Text style={{ opacity: opacity3 }}>.</Animated.Text>
    </Text>
  );
}
