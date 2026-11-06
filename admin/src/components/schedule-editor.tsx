import type { CSSProperties } from 'react';

import type { TouristSpot } from '../types/domain';
import { hintStyle } from './styles';

/** Ingresso do item: `''` = herda o ingresso do evento (campo ausente no payload). */
export type ScheduleTicket = '' | 'free' | 'paid';

/** Item da programação no formato do formulário (todos os campos como texto). */
export interface TourEventScheduleItemForm {
  /** Data do item (AAAA-MM-DD), dentro de [startDate, endDate] do evento. */
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  stage: string;
  /** Atrativo relacionado (id do select de atrações). */
  relatedSpot: string;
  ticket: ScheduleTicket;
  ticketPrice: string;
  ticketUrl: string;
}

/** Item vazio — usado ao adicionar um novo item na programação. */
export const EMPTY_SCHEDULE_ITEM: TourEventScheduleItemForm = {
  date: '',
  startTime: '',
  endTime: '',
  title: '',
  description: '',
  stage: '',
  relatedSpot: '',
  ticket: '',
  ticketPrice: '',
  ticketUrl: '',
};

const TICKET_ITEM_OPTIONS: { value: ScheduleTicket; label: string }[] = [
  { value: '', label: 'Padrão do evento' },
  { value: 'free', label: 'Gratuito' },
  { value: 'paid', label: 'Pago' },
];

// Espelham o zod do backend (backend/src/types/dto.ts, tourEventScheduleItemSchema).
const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Erros de validação de um item da programação (campo → mensagem). */
export interface ScheduleItemErrors {
  date?: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  ticketPrice?: string;
}

export interface ScheduleEditorProps {
  items: TourEventScheduleItemForm[];
  /** Atrações para o select de `relatedSpot` (mesma lista do painel, limitada a 100). */
  spots: TouristSpot[];
  /** Intervalo vigente do evento — os itens devem caber nele. */
  startDate: string;
  endDate: string;
  onChange: (items: TourEventScheduleItemForm[]) => void;
}

/** Confere se o YYYY-MM-DD existe no calendário (rejeita 2026-02-30, 2026-13-01...). */
export function ehDataDeCalendario(valor: string): boolean {
  const data = new Date(`${valor}T12:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

/**
 * Valida um item da programação — espelha as regras do zod no backend:
 * formato e calendário da `date`, vigência no intervalo do evento,
 * `endTime >= startTime` (por string: a ordem lexicográfica É a cronológica)
 * e preço obrigatório quando o ingresso do item é pago.
 */
export function validarItemProgramacao(
  item: TourEventScheduleItemForm,
  startDate: string,
  endDate: string,
): ScheduleItemErrors {
  const erros: ScheduleItemErrors = {};

  if (!DATA_REGEX.test(item.date)) {
    erros.date = 'Data do item inválida — use o formato AAAA-MM-DD (ex.: 2026-11-05).';
  } else if (!ehDataDeCalendario(item.date)) {
    erros.date = 'Data do item não existe no calendário (ex.: 2026-02-30 é inválida).';
  } else if (startDate && endDate && (item.date < startDate || item.date > endDate)) {
    erros.date = 'A data do item deve estar entre a data inicial e a final do evento.';
  }

  if (item.startTime && !HORA_REGEX.test(item.startTime)) {
    erros.startTime = 'Início do item inválido — use o formato HH:mm (ex.: 09:00).';
  }

  if (item.endTime && !HORA_REGEX.test(item.endTime)) {
    erros.endTime = 'Fim do item inválido — use o formato HH:mm (ex.: 18:00).';
  } else if (item.endTime && item.startTime && item.endTime < item.startTime) {
    erros.endTime = 'O fim do item deve ser posterior ou igual ao início.';
  }

  if (!item.title.trim()) {
    erros.title = 'O título do item é obrigatório.';
  }

  if (item.ticket === 'paid' && !item.ticketPrice.trim()) {
    erros.ticketPrice = 'Informe o preço quando o ingresso do item é pago.';
  }

  return erros;
}

/** Valida a programação inteira e devolve a mensagem do primeiro erro (ou nulo). */
export function validarProgramacao(
  items: TourEventScheduleItemForm[],
  startDate: string,
  endDate: string,
): string | null {
  if (items.length > 100) {
    return 'A programação não pode ter mais de 100 itens.';
  }
  for (let indice = 0; indice < items.length; indice += 1) {
    const erros = validarItemProgramacao(items[indice], startDate, endDate);
    for (const mensagem of Object.values(erros)) {
      if (mensagem) {
        return `Item ${indice + 1} da programação: ${mensagem}`;
      }
    }
  }
  return null;
}

/**
 * Move um item da programação na lista (para cima ou para baixo).
 *
 * Devolve uma lista NOVA — o estado do formulário é imutável. Nas bordas
 * (primeiro item subindo, último descendo) a lista volta como está.
 */
export function moverItemProgramacao(
  items: TourEventScheduleItemForm[],
  indice: number,
  direcao: -1 | 1,
): TourEventScheduleItemForm[] {
  const destino = indice + direcao;
  if (indice < 0 || indice >= items.length || destino < 0 || destino >= items.length) {
    return items;
  }

  const movidos = [...items];
  const [removido] = movidos.splice(indice, 1);
  if (!removido) {
    return items;
  }
  movidos.splice(destino, 0, removido);
  return movidos;
}

const fieldsetStyle: CSSProperties = {
  width: '100%',
  border: '1px solid #2e2e2e',
  borderRadius: 10,
  padding: 16,
};

const itemStyle: CSSProperties = {
  width: '100%',
  border: '1px solid #2e2e2e',
  borderRadius: 8,
  padding: 12,
};

const itemHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  width: '100%',
};

/** Botões de ação do item (reordenar e remover). */
const itemAcoesStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

/** Mensagem de erro inline do item (menor e sem a margem global de erro). */
const inlineErrorStyle: CSSProperties = {
  width: '100%',
  color: '#ff6b6b',
  fontSize: 12,
};

/** Editor de itens de programação (um por dia/horário), embutido no formulário de evento. */
export function ScheduleEditor({ items, spots, startDate, endDate, onChange }: ScheduleEditorProps) {
  function atualizar(indice: number, patch: Partial<TourEventScheduleItemForm>) {
    onChange(items.map((item, indiceAtual) => (indiceAtual === indice ? { ...item, ...patch } : item)));
  }

  function adicionar() {
    onChange([...items, { ...EMPTY_SCHEDULE_ITEM }]);
  }

  function remover(indice: number) {
    onChange(items.filter((_, indiceAtual) => indiceAtual !== indice));
  }

  return (
    <fieldset style={fieldsetStyle}>
      <legend>Programação</legend>
      {items.length === 0 && (
        <p style={hintStyle}>Nenhum item — use "Adicionar item" para cadastrar as atrações por dia.</p>
      )}
      {items.map((item, indice) => {
        const erros = validarItemProgramacao(item, startDate, endDate);
        return (
          <div key={indice} style={itemStyle}>
            <div style={itemHeaderStyle}>
              <strong>Item {indice + 1}</strong>
              <div style={itemAcoesStyle}>
                <button
                  type="button"
                  onClick={() => onChange(moverItemProgramacao(items, indice, -1))}
                  disabled={indice === 0}
                  aria-label={`Subir o item ${indice + 1} na programação`}
                >
                  Subir
                </button>
                <button
                  type="button"
                  onClick={() => onChange(moverItemProgramacao(items, indice, 1))}
                  disabled={indice === items.length - 1}
                  aria-label={`Descer o item ${indice + 1} na programação`}
                >
                  Descer
                </button>
                <button type="button" onClick={() => remover(indice)}>
                  Remover
                </button>
              </div>
            </div>
            <input
              placeholder="Título da atração (obrigatório)"
              value={item.title}
              onChange={(event) => atualizar(indice, { title: event.target.value })}
              required
            />
            {erros.title && <p style={inlineErrorStyle}>{erros.title}</p>}
            <textarea
              placeholder="Descrição (opcional)"
              value={item.description}
              onChange={(event) => atualizar(indice, { description: event.target.value })}
              style={{ minWidth: 300, minHeight: 40, width: '100%' }}
            />
            <input
              placeholder="Data do item (AAAA-MM-DD)"
              value={item.date}
              onChange={(event) => atualizar(indice, { date: event.target.value })}
              required
            />
            {erros.date && <p style={inlineErrorStyle}>{erros.date}</p>}
            <input
              placeholder="Início (HH:mm)"
              value={item.startTime}
              onChange={(event) => atualizar(indice, { startTime: event.target.value })}
            />
            {erros.startTime && <p style={inlineErrorStyle}>{erros.startTime}</p>}
            <input
              placeholder="Fim (HH:mm)"
              value={item.endTime}
              onChange={(event) => atualizar(indice, { endTime: event.target.value })}
            />
            {erros.endTime && <p style={inlineErrorStyle}>{erros.endTime}</p>}
            <input
              placeholder="Palco/Local (opcional)"
              value={item.stage}
              onChange={(event) => atualizar(indice, { stage: event.target.value })}
            />
            <select
              value={item.relatedSpot}
              onChange={(event) => atualizar(indice, { relatedSpot: event.target.value })}
            >
              <option value="">Atração relacionada (opcional)</option>
              {spots.map((spot) => (
                <option key={spot._id} value={spot._id}>
                  {spot.name}
                </option>
              ))}
              {/* Atração referenciada que não consta na lista carregada (excluída
                  ou além das 100 primeiras): mantém o id para não perder o link
                  ao salvar. */}
              {item.relatedSpot &&
                !spots.some((spot) => spot._id === item.relatedSpot) && (
                  <option value={item.relatedSpot}>Atração removida do catálogo</option>
                )}
            </select>
            <select
              value={item.ticket}
              onChange={(event) => atualizar(indice, { ticket: event.target.value as ScheduleTicket })}
            >
              {TICKET_ITEM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Ingresso do item: {option.label}
                </option>
              ))}
            </select>
            {/* Preço visível quando pago; também permanece se já havera preço salvo. */}
            {(item.ticket === 'paid' || item.ticketPrice.trim().length > 0) && (
              <input
                placeholder="Preço do ingresso do item (obrigatório se pago)"
                value={item.ticketPrice}
                onChange={(event) => atualizar(indice, { ticketPrice: event.target.value })}
              />
            )}
            {erros.ticketPrice && <p style={inlineErrorStyle}>{erros.ticketPrice}</p>}
            <input
              placeholder="URL do ingresso do item (opcional)"
              value={item.ticketUrl}
              onChange={(event) => atualizar(indice, { ticketUrl: event.target.value })}
            />
          </div>
        );
      })}
      <button type="button" onClick={adicionar}>
        Adicionar item
      </button>
    </fieldset>
  );
}
