import type { CSSProperties } from 'react';

import { FontFamily, FontSize } from '../theme/typography';

/** Estilo dos formulários de criação/edição (mantido do painel original). */
export const formStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginBottom: 24,
  alignItems: 'center',
};

/** Estilo da barra de busca + paginação, acima das tabelas. */
export const toolbarStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: 12,
};

/** Estilo da linha de paginação, abaixo das tabelas. */
export const paginationStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'center',
  marginTop: 12,
  color: '#9ca3af',
  fontSize: FontSize.sm,
  fontFamily: FontFamily.body,
};

/** Estilo das mensagens de erro. */
export const errorStyle: CSSProperties = {
  color: '#ff6b6b',
  marginBottom: 12,
};

/** Estilo das observações auxiliares (dicas e avisos de escopo). */
export const hintStyle: CSSProperties = {
  color: '#9ca3af',
  fontSize: FontSize.xs,
  fontFamily: FontFamily.body,
  marginTop: 8,
};

/** Estilo das opções de formulário (checkbox e afins). */
export const checkLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

/** Estilo do campo de busca. */
export const searchInputStyle: CSSProperties = {
  minWidth: 220,
  padding: '6px 10px',
  background: '#242424',
  border: '1px solid #2e2e2e',
  borderRadius: 8,
  color: '#ffffff',
};
