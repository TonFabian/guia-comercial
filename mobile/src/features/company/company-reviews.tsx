import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Spacing, Typography, FontFamily, FontWeight } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAuthState } from '@/providers/auth-provider';
import { createReview, getReviews } from '@/services/api';
import { ApiError } from '@/services/http';
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
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.base64) setImage(asset.base64);
    }
  }

  async function submit() {
    if (auth.state !== 'signedIn') return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createReview(companyId, ratingInput, comment.trim() || undefined, image ?? undefined);
      if (created) {
        setReviews((prev) => [created, ...prev]);
        setComment('');
        setRatingInput(5);
        setImage(null);
      }
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        const body = e.body as { reason?: string; message?: string } | null;
        setError(body?.reason ?? body?.message ?? 'Não foi possível publicar a avaliação.');
      } else {
        setError('Não foi possível publicar a avaliação.');
      }
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
          <TouchableOpacity style={styles.imageButton} onPress={pickImage} accessibilityRole="button">
            <Ionicons name="image-outline" size={20} color={colors.primary} />
            <Text style={styles.imageButtonText}>Adicionar foto</Text>
          </TouchableOpacity>
          {image && (
            <View style={styles.preview}>
              <Image source={{ uri: `data:image/jpeg;base64,${image}` }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeButton} onPress={() => setImage(null)} accessibilityRole="button">
                <Ionicons name="close-circle" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
              {r.image ? <Image source={{ uri: r.image }} style={styles.reviewImage} /> : null}
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
    formTitle: { color: colors.text, ...Typography.h5 },
    stars: { flexDirection: 'row', gap: 4 },
    input: {
      backgroundColor: colors.surface,
      color: colors.text,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      ...Typography.body,
      minHeight: 60,
    },
    imageButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    imageButtonText: { color: colors.primary, ...Typography.body },
    preview: { position: 'relative' },
    previewImage: { width: 120, height: 120, borderRadius: 10 },
    removeButton: { position: 'absolute', top: 4, right: 4 },
    errorText: { color: '#c00', ...Typography.body },
    submitButton: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    submitText: { color: colors.background, ...Typography.body, fontFamily: FontFamily.body700, fontWeight: FontWeight.bold },
    empty: { alignItems: 'center', gap: 6, paddingVertical: Spacing.three },
    emptyTitle: { color: colors.text, ...Typography.h5 },
    emptyText: { color: colors.textSecondary, ...Typography.body, textAlign: 'center' },
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
    reviewAuthor: { color: colors.text, ...Typography.body, fontFamily: FontFamily.body600, fontWeight: FontWeight.semibold },
    reviewComment: { color: colors.textSecondary, ...Typography.body },
    reviewImage: { width: '100%', height: 160, borderRadius: 10, marginTop: 4 },
  });
}