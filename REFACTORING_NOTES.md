# Notas de Refatoração (local, não commitado)

Ideias para melhorar a qualidade/estrutura do código (P3+):

## Backend
1. Adicionar validação zod em todos os controllers (alguns usam req.body direto).
2. Extrair middleware de autorização (requireOwnerOrAdmin) reutilizável.
3. Adicionar testes de integração para Notice, City, AutonomousProfessional, Review.
4. Padronizar respostas de erro (shape consistente).
5. Adicionar rate limiting (OWASP API4) antes de expor publicamente.

## Mobile
1. Extrair componentes reutilizáveis: botões de contato (WhatsApp, ligar, rota), cards de empresa, chips de filtro.
2. Unificar fetch de dados da Home (atualmente useHomeData + fetch separado de professionals/notices/otherCompanies).
3. Adicionar testes de componentes (React Native Testing Library).
4. Padronizar tratamento de erro (ApiError) em todas as telas.
5. Remover warnings pré-existentes (jobKey, renderJob, system unused).

## Admin
1. Adicionar autenticação Clerk (já integrado, mas sem proteção de rotas).
2. Componentes reutilizáveis (Table, Form, Input).
3. Validação client-side.

## Geral
1. Sincronizar tipos de domínio via script (evitar cópias manuais).
2. Adicionar CI (lint + typecheck + tests) via GitHub Actions.