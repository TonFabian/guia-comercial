import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useRef } from 'react';
import { Pressable, ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { Radius, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { AppNotification } from '@/types/domain';
import { tempoRelativo } from './tempo-relativo';

export interface NotificationItemProps {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
  /** Modo seleção: desativa swipe e mostra checkbox. */
  modoSelecao?: boolean;
  selecionado?: boolean;
  /** Requisição de leitura em andamento para este item (dots loader no lugar do marcador). */
  processando?: boolean;
  onToggleSelecionado?: (item: AppNotification) => void;
  /** Alternar lido/não lido (ação do swipe). */
  onToggleLido?: (item: AppNotification) => void;
}

/**
 * Ícone da ação de swipe: check para marcar como lida (quando está por ler),
 * envelope fechado para marcar como não lida (quando já foi lida) — ícones
 * distintos evitam ambiguidade na mesma cor.
 */
function iconeAcao(unread: boolean) {
  return unread ? 'checkmark-circle-outline' : 'mail-outline';
}

/** Painel da ação de swipe, com ícone que escala conforme o arraste (feedback Outlook). */
function SwipeAcao({ progress, unread }: { progress: { value: number } | { value: number }; unread: boolean }) {
  const colors = useThemeColors();
  const estiloAnimado = useAnimatedStyle(() => {
    const escala = interpolate(progress.value, [0, 1], [0.5, 1], Extrapolation.CLAMP);
    const opacidade = interpolate(progress.value, [0, 0.5], [0, 1], Extrapolation.CLAMP);
    return { transform: [{ scale: escala }], opacity: opacidade };
  });
  return (
    <View style={[styles.swipePanel, { backgroundColor: unread ? colors.primary : colors.border }]}>
      <Animated.View style={[styles.swipeIconWrap, estiloAnimado]}>
        <Ionicons name={iconeAcao(unread)} size={22} color={unread ? colors.background : colors.text} />
      </Animated.View>
    </View>
  );
}

export const NotificationItem = memo(function NotificationItem({
  item,
  onPress,
  modoSelecao = false,
  selecionado = false,
  processando = false,
  onToggleSelecionado,
  onToggleLido,
}: NotificationItemProps) {
  const colors = useThemeColors();
  const swipeableRef = useRef<SwipeableMethods>(null);
  const unread = !item.readAt;
  const icon = item.type === 'coupon' ? 'pricetag-outline' : 'calendar-outline';

  const conteudo = (
    <Pressable
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, backgroundColor: pressed ? colors.surface : colors.background }, selecionado && { backgroundColor: colors.surface }]}
      onPress={() => (modoSelecao ? onToggleSelecionado?.(item) : onPress(item))}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}${unread ? ' (não lida)' : ' (lida)'}${modoSelecao ? (selecionado ? ' (selecionada)' : ' (não selecionada)') : ''}`}
      accessibilityState={{ selected: selecionado }}
    >
      {modoSelecao ? (
        <View
          style={[
            styles.checkbox,
            { borderColor: colors.border },
            selecionado && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
        >
          {selecionado ? <Ionicons name="checkmark" size={16} color={colors.background} /> : null}
        </View>
      ) : null}
      <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }, unread && styles.unread]} numberOfLines={2}>{item.title}</Text>
        {item.body ? <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={2}>{item.body}</Text> : null}
        <Text style={[styles.time, { color: colors.textSecondary }]}>{tempoRelativo(item.createdAt)}</Text>
      </View>
      {processando ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : unread && !modoSelecao ? (
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
      ) : null}
    </Pressable>
  );

  if (modoSelecao) {
    return <View style={[styles.borda, { borderBottomColor: colors.border }]}>{conteudo}</View>;
  }

  const abrir = () => {
    swipeableRef.current?.close();
    onToggleLido?.(item);
  };

  return (
    <View style={[styles.borda, { borderBottomColor: colors.border }]}>
      <ReanimatedSwipeable
        ref={swipeableRef}
        renderLeftActions={(progress: { value: number }) => <SwipeAcao progress={progress} unread={unread} />}
        renderRightActions={(progress: { value: number }) => <SwipeAcao progress={progress} unread={unread} />}
        onSwipeableOpen={abrir}
        overshootFriction={8}
        containerStyle={styles.swipeContainer}
      >
        {conteudo}
      </ReanimatedSwipeable>
    </View>
  );
});

const styles = StyleSheet.create({
  borda: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: { width: 40, height: 40, borderRadius: Radius.circle, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 2 },
  title: { ...Typography.body, fontFamily: FontFamily.body600, fontWeight: FontWeight.semibold },
  unread: { fontFamily: FontFamily.body700, fontWeight: FontWeight.bold },
  body: { ...Typography.caption },
  time: { ...Typography.caption, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: Radius.tag },
  swipePanel: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  swipeIconWrap: { width: 40, height: 40, borderRadius: Radius.circle, alignItems: 'center', justifyContent: 'center' },
  swipeContainer: { overflow: 'hidden' },
});
