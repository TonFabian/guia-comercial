import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography, FontFamily, FontWeight } from '@/constants/theme';
import { getCompanies, updateCompany } from '@/services/api';
import type { Company } from '@/types/domain';
import { useAuthState } from '@/providers/auth-provider';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { cityName } from '@/utils/city';
import { filterOwnedCompanies, resolveContactNumbers } from '@/features/company/owner';

export default function MyCompanyScreen() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const auth = useAuthState();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hoursText, setHoursText] = useState('');
  const [promotionText, setPromotionText] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [samePhone, setSamePhone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (auth.state !== 'signedIn') {
      router.replace('/(auth)/sign-in');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const all: Company[] = [];
        let page = 1;
        while (true) {
          const res = await getCompanies(page, 100);
          all.push(...res.items);
          if (res.items.length < 100 || all.length >= res.total) break;
          page += 1;
        }
        const owned = filterOwnedCompanies(all, auth.user?.clerkId);
        if (!cancelled) setCompanies(owned);
      } catch {
        if (!cancelled) setCompanies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [auth.state, auth.user?.clerkId]);

  function startEdit(company: Company) {
    setEditingId(company._id);
    setHoursText((company.openingHours ?? []).join('\n'));
    setPromotionText(company.promotion ?? '');
    setDescription(company.description ?? '');
    setAddress(company.address ?? '');
    const p = company.phone ?? '';
    const w = company.whatsapp ?? '';
    setPhone(p);
    setWhatsapp(w);
    setSamePhone(Boolean(p) && p === w);
  }

  async function save() {
    if (!editingId) return;
    setSaving(true);
    try {
      const hours = hoursText.split('\n').map((s) => s.trim()).filter(Boolean);
      const { phone: phoneValue, whatsapp: whatsappValue } = resolveContactNumbers(phone, whatsapp, samePhone);
      const descriptionValue = description.trim() || undefined;
      const addressValue = address.trim() || undefined;
      const promotionValue = promotionText.trim() || undefined;
      const updated = await updateCompany(editingId, {
        openingHours: hours,
        promotion: promotionValue,
        description: descriptionValue,
        address: addressValue,
        phone: phoneValue,
        whatsapp: whatsappValue,
      });
      if (!updated) {
        Alert.alert('Empresa', 'Não foi possível salvar. Tente novamente.');
        return;
      }
      setCompanies((prev) =>
        prev.map((c) =>
          c._id === editingId
            ? {
                ...c,
                openingHours: updated.openingHours ?? hours,
                promotion: updated.promotion ?? promotionValue,
                description: updated.description ?? descriptionValue ?? c.description,
                address: updated.address ?? addressValue ?? c.address,
                phone: updated.phone ?? phoneValue ?? null,
                whatsapp: updated.whatsapp ?? whatsappValue ?? null,
              }
            : c,
        ),
      );
      setEditingId(null);
      Alert.alert('Empresa', 'Horários atualizados com sucesso.');
    } catch {
      Alert.alert('Empresa', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
            <Text style={styles.topButtonText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Minha Empresa</Text>
        </View>

        {companies.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.empty}>Você ainda não tem empresas cadastradas.</Text>
            <TouchableOpacity style={styles.cta} onPress={() => router.push('/announce')}>
              <Text style={styles.ctaText}>Anunciar minha empresa</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {companies.map((c) => (
              <View key={c._id} style={styles.card}>
                <Text style={styles.cardTitle}>{c.name}</Text>
                <Text style={styles.cardMeta}>{cityName(c.city) || '—'}</Text>

                {editingId === c._id ? (
                  <>
                    <Text style={styles.label}>Horários (um por linha)</Text>
                    <TextInput
                      style={styles.input}
                      value={hoursText}
                      onChangeText={setHoursText}
                      multiline
                      placeholder="Seg a Sex: 08h às 18h"
                      placeholderTextColor={colors.textSecondary}
                    />
                    <Text style={styles.label}>Descrição</Text>
                    <TextInput
                      style={[styles.input, styles.phoneInput]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Descrição da empresa"
                      placeholderTextColor={colors.textSecondary}
                    />
                    <Text style={styles.label}>Endereço</Text>
                    <TextInput
                      style={[styles.input, styles.phoneInput]}
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Rua, número, bairro"
                      placeholderTextColor={colors.textSecondary}
                    />
                    <Text style={styles.label}>Promoção (opcional)</Text>
                    <TextInput
                      style={styles.input}
                      value={promotionText}
                      onChangeText={setPromotionText}
                      placeholder="Ex.: 20% OFF em pizzas hoje!"
                      placeholderTextColor={colors.textSecondary}
                    />
                    <Text style={styles.label}>Telefone (ligar)</Text>
                    <TextInput
                      style={[styles.input, styles.phoneInput]}
                      value={phone}
                      onChangeText={(v) => {
                        setPhone(v);
                        if (samePhone) setWhatsapp(v);
                      }}
                      placeholder="(85) 99999-0000"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="phone-pad"
                    />
                    <TouchableOpacity style={styles.checkboxRow} onPress={() => {
                      const next = !samePhone;
                      setSamePhone(next);
                      if (next) setWhatsapp(phone);
                    }}>
                      <View style={[styles.checkbox, samePhone && styles.checkboxChecked]}>
                        {samePhone ? <Text style={styles.checkboxMark}>✓</Text> : null}
                      </View>
                      <Text style={styles.checkboxLabel}>Usar o mesmo número para WhatsApp</Text>
                    </TouchableOpacity>
                    <Text style={styles.label}>WhatsApp</Text>
                    <TextInput
                      style={[styles.input, styles.phoneInput, samePhone && styles.inputDisabled]}
                      value={whatsapp}
                      onChangeText={setWhatsapp}
                      placeholder="(85) 99999-0000"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="phone-pad"
                      editable={!samePhone}
                    />
                    <View style={styles.actions}>
                      <TouchableOpacity style={styles.btn} onPress={() => setEditingId(null)}>
                        <Text style={styles.btnText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={save} disabled={saving}>
                        <Text style={[styles.btnText, styles.btnPrimaryText]}>{saving ? 'Salvando…' : 'Salvar'}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>Horários</Text>
                    {c.promotion ? <Text style={styles.promoLine}>🔥 {c.promotion}</Text> : null}
                    {(c.openingHours ?? []).map((h, i) => (
                      <Text key={i} style={styles.hourLine}>{h}</Text>
                    ))}
                    {(!c.openingHours || c.openingHours.length === 0) && (
                      <Text style={styles.hourLineMuted}>Não informado</Text>
                    )}
                    <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(c)}>
                      <Text style={styles.editBtnText}>Editar horários</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    safeArea: { flex: 1 },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    topButton: { paddingVertical: 6, paddingHorizontal: 10 },
    topButtonText: { color: colors.primary, ...Typography.body, fontFamily: FontFamily.body600, fontWeight: FontWeight.semibold },
    title: { color: colors.text, ...Typography.h3 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 },
    empty: { color: colors.textSecondary, ...Typography.h5, textAlign: 'center' },
    cta: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
    ctaText: { color: colors.background, ...Typography.body, fontFamily: FontFamily.body700, fontWeight: FontWeight.bold },
    content: { padding: 16, gap: 12 },
    card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 },
    cardTitle: { color: colors.text, ...Typography.h5, fontFamily: FontFamily.body700, fontWeight: FontWeight.bold },
    cardMeta: { color: colors.textSecondary, ...Typography.body },
    label: { color: colors.textSecondary, ...Typography.caption, fontFamily: FontFamily.body700, fontWeight: FontWeight.bold, textTransform: 'uppercase', marginTop: 4 },
    hourLine: { color: colors.text, ...Typography.body },
    promoLine: { color: colors.primary, ...Typography.body, fontFamily: FontFamily.body600, fontWeight: FontWeight.semibold },
    hourLineMuted: { color: colors.textSecondary, ...Typography.body, fontStyle: 'italic' },
    input: { backgroundColor: colors.background, color: colors.text, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, ...Typography.body, minHeight: 80, textAlignVertical: 'top' },
    phoneInput: { minHeight: 44 },
    inputDisabled: { opacity: 0.6 },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    checkboxMark: { color: colors.background, ...Typography.body, fontFamily: FontFamily.body700, fontWeight: FontWeight.bold },
    checkboxLabel: { color: colors.text, ...Typography.body },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
    btn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.surfaceAlt },
    btnText: { color: colors.text, ...Typography.body, fontFamily: FontFamily.body600, fontWeight: FontWeight.semibold },
    btnPrimary: { backgroundColor: colors.primary },
    btnPrimaryText: { color: colors.background },
    editBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, marginTop: 4 },
    editBtnText: { color: colors.primary, ...Typography.body, fontFamily: FontFamily.body600, fontWeight: FontWeight.semibold },
  });
}
