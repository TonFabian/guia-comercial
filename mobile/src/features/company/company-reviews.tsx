import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Spacing, Type } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAuthState } from '@/providers/auth-provider';
import { createReview, getReviews } from '@/services/api';
import type { Review } from '@/types/domain';

import { CompanyRating } from './company-rating';

interface CompanyReviewsProps {
  companyId: string;
  rating?: number;
  ratingCount?: number;
}

export function CompanyReviews({ companyId, rating, ratingCount }: CompanyReviewsProps) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const auth = useAuthState();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingInput, setRatingInput] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Carrega avaliações ao montar.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await getReviews(companyId);
      if (!cancelled) {
        setReviews(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  async function submit() {
    if (auth.state !== 'signedIn') return;
    setSubmitting(true);
    const created = await createReview(companyId, ratingInput, comment.trim() || undefined);
    if (created) {
      setReviews((prev) => [created, ...prev]);
      setComment('');
      setRatingInput(5);
    }
    setSubmitting(false);
  }

  return (
    <>
      {rating !== undefined && (
        <View style={styles.summary}>
          <CompanyRating rating={rating} ratingCount={ratingCount} size="title" />
        </View>
      )}

      {auth.state === 'signedIn' && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Deixe sua avaliação</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRatingInput(n)} accessibilityRole="button">
                <Ionicons
                  name={n <= ratingInput ? 'star' : 'star-outline'}
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Comentário (opcional)"
            placeholderTextColor={colors.textSecondary}
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <TouchableOpacity
            style={styles.submitButton}
            onPress={submit}
            disabled={submitting}
            accessibilityRole="button"
          >
            <Text style={styles.submitText}>{submitting ? 'Enviando…' : 'Publicar'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : reviews.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Ainda sem avaliações detalhadas</Text>
          <Text style={styles.emptyText}>
            As opiniões dos clientes aparecerão aqui assim que forem publicadas.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {reviews.map((r) => (
            <View key={r._id} style={styles.review}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>{r.authorName ?? 'Usuário'}</Text>
                <CompanyRating rating={r.rating} size="body" />
              </View>
              {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    summary: { flexDirection: 'row', alignItems: 'center' },
    form: { gap: 8, paddingVertical: Spacing.two },
    formTitle: { color: colors.text, fontSize: Type.subtitle, fontWeight: '600' },
    stars: { flexDirection: 'row', gap: 4 },
    input: {
      backgroundColor: colors.surface,
      color: colors.text,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: Type.base,
      minHeight: 60,
    },
    submitButton: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    submitText: { color: colors.background, fontSize: Type.base, fontWeight: '700' },
    empty: { alignItems: 'center', gap: 6, paddingVertical: Spacing.three },
    emptyTitle: { color: colors.text, fontSize: Type.subtitle, fontWeight: '600' },
    emptyText: { color: colors.textSecondary, fontSize: Type.body, textAlign: 'center' },
    list: { gap: Spacing.two },
    review: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.two,
      gap: 4,
    },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    reviewAuthor: { color: colors.text, fontSize: Type.base, fontWeight: '600' },
    reviewComment: { color: colors.textSecondary, fontSize: Type.body },
  });
}