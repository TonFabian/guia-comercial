# Design: Auditoria Completa da Aplicação

Data: 2026-11-07

Baseado na auditoria realizada via goldfish reviewers (reviewers: implementation_readiness, codebase_details).

## Intent

Auditar toda a aplicação (backend, mobile, admin) para identificar o que existe,
o que falta, brechas de segurança e novas funcionalidades.

## Goals

- Listar funcionalidades existentes e pendentes.
- Identificar blockers (segurança modo legado, README fora do padrão).
- Priorizar ações (rate limiting, multi-cidade, tipos, testes admin, CI).

## Non-goals

- Implementar tudo de uma vez; este spec gera backlog priorizado.

## Abordagens

1. Auditoria via goldfish reviewers (escolhida).
2. Revisão manual por app (descartada por custo).

## Riscos

- Modo legado sem auth em produção.
- Drift de tipos.
- Baixa cobertura admin.

## Findings da auditoria (incorporados)

### Blocker
- Task 4 multi-cidade: hardcode "Castelo do Piauí" não localizado; default/fallback/AsyncStorage/GPS não projetados.

### Major
- Task 1: gate de startup sem módulo/função/teste definidos.
- Task 2: rate limiting sem versão/env vars/defaults/rotas.
- Task 3: teste de equivalência de tipos sem mecanismo/CI.
- Task 5: testes admin sem escopo (seções/casos).
- Task 6: CI sem Node version/matrix/comandos.

### Nit
- Task 7: grep gate sem allowlist/CI.
- Task 8: backlog sem métricas/rubrica.

## Próximos passos

Ver plano: docs/superpowers/plans/2026-11-07-auditoria-aplicacao.md.