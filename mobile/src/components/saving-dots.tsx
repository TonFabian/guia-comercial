import { useEffect, useState } from 'react';
import { Animated, Text, View } from 'react-native';

import { FontFamily, FontWeight, Typography } from '@/constants/theme';

/**
 * Efeito de pontos animados (DotsLoading) centralizado, sem texto.
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

  const dotStyle = { color, ...Typography.body, fontFamily: FontFamily.body700, fontWeight: FontWeight.bold, marginHorizontal: 2 };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.Text style={[dotStyle, { opacity: opacity1 }]}>•</Animated.Text>
      <Animated.Text style={[dotStyle, { opacity: opacity2 }]}>•</Animated.Text>
      <Animated.Text style={[dotStyle, { opacity: opacity3 }]}>•</Animated.Text>
    </View>
  );
}
