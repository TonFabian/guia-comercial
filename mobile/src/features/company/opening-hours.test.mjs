import assert from 'node:assert/strict';
import test from 'node:test';

import { getOpeningStatus } from './opening-hours.ts';

const WEEKDAY_HOURS = {
  weekdays: '08h–18h',
  saturday: '08h–12h',
  sunday: 'Fechado',
};

function dateAt(day, hour, minute = 0) {
  return new Date(2026, 10, day, hour, minute, 0);
}

test('abre durante o horário de segunda a sexta', () => {
  assert.equal(getOpeningStatus(WEEKDAY_HOURS, dateAt(2, 10)), 'open');
});

test('fecha depois do horário de segunda a sexta', () => {
  assert.equal(getOpeningStatus(WEEKDAY_HOURS, dateAt(2, 19)), 'closed');
});

test('abre no sábado dentro do horário reduzido', () => {
  assert.equal(getOpeningStatus(WEEKDAY_HOURS, dateAt(7, 9)), 'open');
});

test('fecha no sábado depois do horário reduzido', () => {
  assert.equal(getOpeningStatus(WEEKDAY_HOURS, dateAt(7, 13)), 'closed');
});

test('fecha no domingo quando o dia está marcado como fechado', () => {
  assert.equal(getOpeningStatus(WEEKDAY_HOURS, dateAt(1, 10)), 'closed');
});

test('considera aberto até o horário limite de "Aberto até 23h"', () => {
  const hours = {
    weekdays: 'Aberto até 23h',
    saturday: 'Aberto até 23h',
    sunday: 'Aberto até 23h',
  };

  assert.equal(getOpeningStatus(hours, dateAt(2, 22)), 'open');
  assert.equal(getOpeningStatus(hours, dateAt(2, 23)), 'closed');
});

test('considera 24h aberto em qualquer horário', () => {
  const hours = { weekdays: '24h', saturday: '24h', sunday: '24h' };

  assert.equal(getOpeningStatus(hours, dateAt(2, 3)), 'open');
});

test('interpreta horários no formato com dois pontos', () => {
  const hours = {
    weekdays: '08:00 às 18:00',
    saturday: '08:00 às 12:00',
    sunday: 'Fechado',
  };

  assert.equal(getOpeningStatus(hours, dateAt(2, 8)), 'open');
  assert.equal(getOpeningStatus(hours, dateAt(2, 18)), 'closed');
});

test('suporta horário que atravessa a meia-noite', () => {
  const hours = {
    weekdays: '18h–02h',
    saturday: '18h–02h',
    sunday: '18h–02h',
  };

  assert.equal(getOpeningStatus(hours, dateAt(2, 23)), 'open');
  assert.equal(getOpeningStatus(hours, dateAt(2, 1)), 'open');
  assert.equal(getOpeningStatus(hours, dateAt(2, 3)), 'closed');
});

test('retorna desconhecido quando o horário não pode ser interpretado', () => {
  const hours = {
    weekdays: 'Consulte a empresa',
    saturday: 'Consulte a empresa',
    sunday: 'Consulte a empresa',
  };

  assert.equal(getOpeningStatus(hours, dateAt(2, 10)), 'unknown');
});
