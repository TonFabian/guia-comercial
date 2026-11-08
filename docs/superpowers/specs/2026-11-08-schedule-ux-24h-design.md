# Spec: UX de Cadastro de Horários (Company e TouristSpot)

Data: 2026-11-08

## Intent

O cadastro de `schedule` ({ day, opens, closes } em minutos) hoje exige que o
usuário digite minutos (0–1439) ou use controles crus. Isso é inamigável.
Queremos uma UI intuitiva em formato 24h (HH:MM) que converta para minutos
antes de salvar, com opções de adicionar dia por dia ou aplicar a semana toda.

## Goals

- Entrada em formato 24h (HH:MM) com validação; conversão para minutos
  internamente (opens/closes).
- Opção "aplicar a todos os dias" / "copiar para a semana" para preencher
  rapidamente (ex.: Seg–Sex 08:00–18:00).
- Adicionar/remover dias individualmente (dia por dia) também disponível.
- Cruzamento de meia-noite (closes < opens) suportado (ex.: 18:00–02:00).
- Sem regressão na exibição ("aberto agora", grade por dia).

## Non-goals

- Timezone por empresa (usa horário local do device).
- Múltiplas faixas por dia (manter uma faixa por dia nesta iteração).

## Abordagem (UX)

- **Mobile (my-company):** lista de 7 dias (Dom–Sáb). Cada dia tem toggle
  (aberto/fechado) + dois pickers de hora (abertura/fechamento) em 24h.
  Botão "Aplicar a todos os dias abertos" / "Copiar para dias selecionados".
  Estado interno em minutos; envio de `schedule` ao backend.
- **Admin (empresas/atracoes):** mesma grade, com `<input type="time">`
  (24h) nativo do navegador; botão "Preencher semana".
- Validação: abertura < fechamento OU (fechamento < abertura = meia-noite).
- Conversão: `HH:MM` → `hour*60 + minute`.

## Riscos

- Picker nativo pode variar por plataforma (mobile: DateTimePicker; admin: input time).
- Validação de meia-noite no formulário.

## Critério de sucesso

- Usuário cadastra horário em 24h sem ver minutos.
- "Aberto agora" e exibição continuam corretos.
- Sem `openingHours` textual em novos cadastros.
