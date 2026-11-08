import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { FontFamily, FontWeight, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

import type { DayState } from './schedule-editor';
import { parseTimeInput } from './schedule-editor';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

type Props = {
  value: DayState[];
  onChange: (next: DayState[]) => void;
};

/**
 * Grade de 7 dias do editor de horários: toggle por dia + abertura/fechamento
 * em formato 24h ("HH:mm"). Estado fica em strings; a conversão para minutos
 * acontece em dayStatesToSchedule na hora de salvar.
 */
export function ScheduleEditorGrid({ value, onChange }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  function setDay(day: number, patch: Partial<DayState>) {
    onChange(value.map((estado) => (estado.day === day ? { ...estado, ...patch } : estado)));
  }

  function toggleDay(day: number) {
    const estado = value.find((item) => item.day === day);
    if (!estado) return;
    if (estado.isOpen) {
      setDay(day, { isOpen: false });
    } else {
      setDay(day, { isOpen: true, opens: estado.opens || '08:00', closes: estado.closes || '18:00' });
    }
  }

  const [modeloOpens, setModeloOpens] = useState('08:00');
  const [modeloCloses, setModeloCloses] = useState('18:00');

  function aplicarModelo() {
    onChange(
      value.map((estado) =>
        estado.isOpen ? { ...estado, opens: modeloOpens, closes: modeloCloses } : estado,
      ),
    );
  }

  const algumAberto = value.some((item) => item.isOpen);

  return (
    <View>
      <View style={styles.modeloRow}>
        <Text style={styles.modeloLabel}>Aplicar a todos os dias abertos:</Text>
        <TextInput
          style={styles.horaInput}
          value={modeloOpens}
          onChangeText={setModeloOpens}
          placeholder="08:00"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          accessibilityLabel="Horário de abertura padrão"
        />
        <Text style={styles.horaSeparador}>às</Text>
        <TextInput
          style={styles.horaInput}
          value={modeloCloses}
          onChangeText={setModeloCloses}
          placeholder="18:00"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          accessibilityLabel="Horário de fechamento padrão"
        />
        <TouchableOpacity
          style={[styles.aplicarBtn, !algumAberto && styles.aplicarBtnDesabilitado]}
          onPress={aplicarModelo}
          disabled={!algumAberto}
          accessibilityRole="button"
          accessibilityLabel="Aplicar este horário a todos os dias abertos"
        >
          <Text style={styles.aplicarText}>Aplicar</Text>
        </TouchableOpacity>
      </View>

      {value.map((estado) => {
        const opensInvalido = estado.isOpen && parseTimeInput(estado.opens) === null;
        const closesInvalido = estado.isOpen && parseTimeInput(estado.closes) === null;
        return (
          <View key={estado.day} style={styles.diaRow}>
            <Text style={styles.diaNome}>{DAY_LABELS[estado.day]}</Text>
            <TouchableOpacity
              style={[styles.diaToggle, estado.isOpen && styles.diaToggleAberto]}
              onPress={() => toggleDay(estado.day)}
              accessibilityRole="button"
              accessibilityState={{ checked: estado.isOpen }}
              accessibilityLabel={`${estado.isOpen ? 'Fechar' : 'Abrir'} ${DAY_LABELS[estado.day]}`}
            >
              <Text style={[styles.diaToggleText, estado.isOpen && styles.diaToggleTextAberto]}>
                {estado.isOpen ? 'Aberto' : 'Fechado'}
              </Text>
            </TouchableOpacity>
            {estado.isOpen ? (
              <>
                <TextInput
                  style={[styles.horaInput, opensInvalido && styles.horaInputInvalido]}
                  value={estado.opens}
                  onChangeText={(texto) => setDay(estado.day, { opens: texto })}
                  placeholder="08:00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  inputMode="numeric"
                  accessibilityLabel={`Abertura de ${DAY_LABELS[estado.day]} em 24 horas`}
                />
                <Text style={styles.horaSeparador}>às</Text>
                <TextInput
                  style={[styles.horaInput, closesInvalido && styles.horaInputInvalido]}
                  value={estado.closes}
                  onChangeText={(texto) => setDay(estado.day, { closes: texto })}
                  placeholder="18:00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  inputMode="numeric"
                  accessibilityLabel={`Fechamento de ${DAY_LABELS[estado.day]} em 24 horas`}
                />
              </>
            ) : null}
          </View>
        );
      })}

      <Text style={styles.dica}>
        Formato 24h (00:00–23:59). Uma faixa por dia; meia-noite cruzada também
        é aceita.
      </Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    aplicarBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    aplicarBtnDesabilitado: {
      opacity: 0.5,
    },
    modeloRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    modeloLabel: {
      color: colors.textSecondary,
      ...Typography.caption,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
    },
    aplicarText: {
      color: colors.background,
      ...Typography.caption,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
    },
    diaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
    },
    diaNome: {
      width: 38,
      color: colors.text,
      ...Typography.body,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
    },
    diaToggle: {
      width: 82,
      paddingVertical: 6,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    diaToggleAberto: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    diaToggleText: {
      color: colors.textSecondary,
      ...Typography.caption,
      fontFamily: FontFamily.body600,
      fontWeight: FontWeight.semibold,
    },
    diaToggleTextAberto: {
      color: colors.background,
    },
    horaInput: {
      width: 72,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.text,
      ...Typography.body,
      textAlign: 'center',
    },
    horaInputInvalido: {
      borderColor: colors.error,
    },
    horaSeparador: {
      color: colors.textSecondary,
      ...Typography.caption,
    },
    dica: {
      marginTop: 8,
      color: colors.textSecondary,
      ...Typography.caption,
    },
  });
}
