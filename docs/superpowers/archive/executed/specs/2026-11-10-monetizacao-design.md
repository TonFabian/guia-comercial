# Monetização do Guia Comercial — Design

Data: 2026-11-10

## Intent

Definir como o Guia Comercial gera receita sem desvirtuar o produto (guia de
descoberta + contato, não marketplace). Hoje a monetização é implícita e
binária (`isFeatured === true` → tela completa; caso contrário → tela enxuta).
Este spec formaliza planos, preços, perfis, módulo B2B para prefeituras e
estratégia de validação, para servir de base ao planejamento de
implementação.

## Contexto do produto

- App hiperlocal (Castelo do Piauí) com arquitetura pensada para replicação
  multi-cidade (SaaS) no futuro, mas lançamento inicial em uma cidade.
- Dois lados de mercado: **lojistas** (B2C pequeno, receita recorrente) e
  **prefeituras/associações** (B2B, receita de licença).
- Cidadão é sempre gratuito; receita vem de lojistas e prefeituras.
- Vendas fecham no WhatsApp da empresa (fora do app). O app monetiza
  descoberta, contato e destaque — não a transação.

## Princípio orientador

> O app é guia, não marketplace.

- Não haverá checkout/pagamento in-app no MVP.
- E-commerce completo (carrinho, PIX/cartão, fulfillment, devoluções) fica
  fora de escopo: complexidade desproporcional, concorrência com iFood/Shopee
  sem moat, risco de reputação.
- Onde vendas fazem sentido: **catálogo de produtos** (`CompanyProduct` já
  existe no domínio) exposto na tela da empresa com botão "Pedir no WhatsApp",
  mais **destaque de produto** e **cupom patrocinado**. A venda continua no
  WhatsApp; o app cobra pela visibilidade e pelo lead.

## Perfis e valor entregue

| Perfil | O que recebe | Paga? |
|---|---|---|
| Convidado (sem login) | Navegação, empresas (contato redigido), utilidades, avisos | Não |
| Usuário cadastrado | Contato completo, favoritos, notificações, cupons | Não |
| Lojista Gratuito | Tela enxuta, aparece na busca por categoria | Não |
| Lojista Básico | Tela completa + recursos do plano | Sim (assinatura) |
| Lojista Premium | Tela completa + recursos avançados | Sim (assinatura) |
| Prefeitura | Módulo Guia Municipal | Sim (licença) |
| Admin/editor | Painel admin | Interno |

### Premium cidadão (futuro, não no MVP)

Benefícios bancados pelas empresas (marketing), não pelo cidadão:
- Cupons exclusivos de empresas parceiras.
- Cashback/pontos de engajamento.
- Clube de vantagens (descontos em empresas do guia).
- O cidadão nunca paga diretamente.

## Planos lojista (B2C)

### Gratuito — R$ 0
- Tela enxuta: foto única, nome, status, categoria, endereço, descrição
  (4 linhas), horários, botões WhatsApp/Ligar.
- Aparece na busca por categoria.
- Contato redigido para convidados (`ContactHintRow`).

### Básico — R$ 29/mês (R$ 290/ano)
- Tela completa: hero, galeria, "A Nossa História", status badge, mapa.
- Promoção editável.
- Badge "Destaque" discreto.
- Catálogo de produtos (até 5 itens) com botão "Pedir no WhatsApp".
- Prioridade na busca por categoria.

### Premium — R$ 59/mês (R$ 590/ano)
- Tudo do Básico.
- Serviços clicáveis (WhatsApp por serviço).
- Cupom destacado.
- Analytics do lojista: views, cliques no WhatsApp, favoritos.
- Prioridade no carrossel "Promoções da Semana".
- Selo "Verificado".
- Catálogo ilimitado.
- Destaque na Home (1x/semana).

### Receita por lead (monetizar vendas via WhatsApp sem domínio)
- **Cupom patrocinado**: R$ 19/mês por cupom ativo. Mede "cupons
  resgatados" como proxy de venda.
- **Produto destacado**: R$ 9/mês por produto no carrossel "Produtos da
  Semana" (Home).
- **Analytics de lead**: relatório mensal de views/cliques WhatsApp.
- **Comissão simbólica (futuro)**: desconto na mensalidade em troca de
  comprovação de vendas originadas do app (gamificação, não obrigação).

### Validação
- Beta gratuito por 60 dias para os primeiros 20 lojistas, em troca de
  depoimento/caso de uso.
- Preço "de validação" (baixo) para facilitar o "sim"; reajuste após 3 meses
  com base em feedback.
- Venda presencial inicialmente (ir porta a porta); self-service no futuro.
- Meta de validação: ≥ 10 lojistas pagantes em 90 dias; conversão
  Gratuito→Básico ≥ 5%; churn mensal ≤ 10%.

## Módulo Prefeitura (B2B) — "Guia Municipal"

Licença anual. Piloto gratuito de 90 dias para 1–2 prefeituras em troca de
case/depoimento.

### Inclui
- Painel admin para publicar avisos oficiais (vacinação, coleta de lixo,
  eventos, alertas) com **push notification** para cidadãos.
- Utilidades públicas gerenciáveis (telefones de emergência, UBS, delegacia,
  saneamento).
- Relatório de engajamento (views por aviso, cliques, alcance).
- Destaque de empresas locais (prefeitura "patrocina" a vitrine — receita
  compartilhada).

### Futuro (fase 2)
- Canal de ouvidoria/denúncias.
- Agendamento de serviços municipais.

### Ticket
- Módulo completo: R$ 1.500–3.000/mês (R$ 18–36k/ano).
- Só avisos + utilidades: R$ 500–1.000/mês.
- Meta de validação: ≥ 1 prefeitura piloto.

## Fora do MVP (fase 2+)

- E-commerce/checkout in-app (vendas continuam no WhatsApp).
- Cobrança direta ao cidadão.
- Ouvidoria/agendamento municipal.
- Comissão sobre vendas.
- Multi-cidade (SaaS) — arquitetura preparada, lançamento inicial em Castelo
  do Piauí.
- Premium cidadão (benefícios bancados por empresas).

## Modelo de dados necessário (futuro, não implementar agora)

- `Company.plan`: `'free' | 'basic' | 'premium'` (substitui a regra binária
  `isFeatured` gradualmente; manter `isFeatured` como alias de "destaque" no
  MVP).
- `Company.subscription`: `{ status, startedAt, expiresAt, provider }`.
- `CompanyProduct`: já existe; expor na tela de detalhe com botão WhatsApp.
- `Coupon.sponsored: boolean` + `expiresAt`.
- `CompanyAnalytics`: views, whatsappClicks, favorites (agregado por período).
- `Notice` já existe; adicionar `official: boolean` e `pushSentAt` para o
  módulo municipal.

## Métricas de sucesso (validação)

- ≥ 10 lojistas pagantes em 90 dias (beta).
- ≥ 1 prefeitura piloto.
- Taxa de conversão Gratuito→Básico ≥ 5%.
- Churn mensal ≤ 10%.

## Riscos

- Preço de validação baixo pode ancorar; mitigar com reajuste após 3 meses e
  comunicação de "preço de fundador".
- Venda presencial não escala; planejar self-service (onboarding automático)
  para fase 2.
- Prefeitura com orçamento apertado: piloto gratuito reduz risco de
  rejeição; case/depoimento compensa.
- Sem domínio sobre a venda (WhatsApp): métricas de conversão serão proxy
  (cliques), não transações reais. Aceitável no MVP.

## Critério de sucesso

- Spec aprovado pelo usuário.
- Planos e preços documentados e acordados.
- Próximo passo: invocar `writing-plans` para criar o plano de
  implementação do MVP de monetização.