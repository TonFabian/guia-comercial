# Configurações — Design

## Intent

Completar a tela **Configurações** com preferências reais de notificação,
canais de suporte/termos e exibição da versão do app, mantendo as seções já
existentes (Aparência, Minha empresa e Sobre).

## Escopo

- **In scope:**
  - Dois switches persistidos em `User.preferences`:
    - Avisos de utilidade pública (saúde, coleta de lixo, comunicados).
    - Notificações de novas vagas de emprego.
  - Remoção do switch genérico “Avisos e novidades” da UI.
  - Botão “Ajuda & Suporte via WhatsApp”.
  - Botão “Termos de Uso e Privacidade”.
  - Exibição da versão do app (`v1.0.0`).
  - Constantes centralizadas para WhatsApp e URL de termos.
  - Testes de DTO e de integração de `PUT /me`.
- **Out of scope:**
  - Implementar envio segmentado de push no backend.
  - Criar tela interna de termos ou política de privacidade.
  - Alterar o fluxo de permissão de notificações do sistema operacional.
  - Redesenhar as seções Aparência, Minha empresa ou Sobre.

## Decisões

| Tema | Decisão |
| --- | --- |
| Persistência | `User.preferences.publicUtilityAlerts` e `User.preferences.jobPostingAlerts` no backend e nas três cópias de tipos. |
| Campo legado | `preferences.notifications` permanece no domínio/modelo/DTO por compatibilidade, mas não aparece na UI. |
| Defaults | Ambos os switches começam ligados (`true`) quando o campo não existe. |
| Envio | A tela sempre envia os dois valores em `PUT /me`, pois o service substitui o objeto `preferences` inteiro. |
| Visitante | Switches desabilitados e link “Entre para ativar” para `/(auth)/sign-in`. |
| Leitura | Preferências vêm de `GET /me`; enquanto carrega, o card mostra indicador. |
| Suporte | `openWhatsApp` com número e mensagem centralizados em `src/constants/support.ts`. |
| Termos | `openExternalUrl` com URL centralizada em `src/constants/support.ts`; valor provisório nesta entrega. |
| Versão | `Constants.expoConfig?.version` com fallback `1.0.0`, exibida como `v1.0.0`. |

## Arquitetura

```
mobile/src/
  app/settings.tsx                    → rota fina já existente
  features/settings/settings-screen.tsx → seções e handlers
  constants/support.ts                → WhatsApp e URL de termos
  services/api.ts                     → getMe/updateMe já existentes
  utils/links.ts                      → openWhatsApp/openExternalUrl

shared/domain.ts                      → preferences.*
mobile/src/types/domain.ts            → cópia sincronizada
admin/src/types/domain.ts             → cópia sincronizada

backend/src/
  models/user.model.ts                → defaults dos novos campos
  types/dto.ts                        → updateUserSchema.preferences.*
```

- A rota não contém regra nem markup.
- A tela não usa `fetch`; toda I/O passa por `api.ts`.
- Links externos passam por `utils/links.ts`, que já trata falha de `Linking`.

## Modelo de dados

```ts
preferences?: {
  notifications?: boolean;
  publicUtilityAlerts?: boolean;
  jobPostingAlerts?: boolean;
};
```

- **Mongoose:** `publicUtilityAlerts` e `jobPostingAlerts` com
  `default: true`.
- **DTO:** ambos `z.boolean().optional()`.
- **Mobile:** ausência do campo é tratada como `true` na tela.
- **Compatibilidade:** documentos antigos continuam válidos; o campo
  `notifications` não é removido.

## UI

Ordem das seções:

1. **Aparência** — mantém Claro/Escuro.
2. **Notificações** — duas linhas com switch:
   - “Avisos de utilidade pública” — “Saúde, coleta de lixo e comunicados.”
   - “Novas vagas de emprego” — “Receba vagas publicadas no guia.”
3. **Minha empresa** — mantém o atalho para `/my-company`.
4. **Suporte & Termos**:
   - “Ajuda & Suporte via WhatsApp” — abre `openWhatsApp`.
   - “Termos de Uso e Privacidade” — abre `openExternalUrl`.
5. **Sobre** — nome do app e `Versão v1.0.0`.

Cada switch:

- `disabled` quando `state !== 'signedIn'`, carregando ou salvando.
- Atualização otimista: muda na hora e, em falha, reverte e mostra mensagem.
- `accessibilityLabel` explícito e `accessibilityState` quando aplicável.

## Fluxos

### Logado

1. Carrega `GET /me` uma vez; aplica `publicUtilityAlerts` e
   `jobPostingAlerts`, usando `true` como fallback.
2. Ao alternar um switch:
   - Atualiza o estado local imediatamente.
   - Envia `updateMe({ preferences: { publicUtilityAlerts, jobPostingAlerts } })`.
   - Em sucesso, mantém; em falha, reverte e exibe erro.
3. Botões de suporte/termos funcionam independentemente de auth.

### Visitante ou sem sessão

- Switches visíveis, desabilitados, com link “Entre para ativar”.
- Nenhuma chamada autenticada é disparada.

### Carregando

- Card de notificações mostra `ActivityIndicator` até saber as preferências.
- Demais seções continuam visíveis.

## Erros

- Falha ao carregar: mantém defaults `true`, libera os switches e não quebra
  a tela.
- Falha ao salvar: reverte o switch alterado e mostra
  “Não foi possível salvar a preferência de notificações.”
- Falha ao abrir link: `utils/links.ts` já mostra `Alert` com fallback.

## Acessibilidade

- Switch com label descritivo (“Ativar avisos de utilidade pública” e
  “Ativar notificações de novas vagas”).
- Linhas de suporte/termos com `accessibilityRole="button"` e labels
  explícitos.
- Nunca depender só de cor para indicar estado.

## Testes

- **DTO:** aceita `publicUtilityAlerts`/`jobPostingAlerts` booleanos e rejeita
  valores de outro tipo.
- **Backend:** `PUT /me` persiste os dois campos e devolve o objeto atualizado.
- **Estático:** `npm run typecheck` e `npm run lint` no mobile/backend.
- **Suíte:** `npm test` em mobile e backend.
- **Bundle:** `npx expo export --platform web`.
- **Manual:** logado alterna cada switch, reabre a tela e confere persistência;
  visitante vê switches desabilitados; WhatsApp e termos abrem.

## Critérios de aceite

- A seção Notificações tem exatamente os dois switches pedidos.
- Preferências persistem entre sessões após reabrir Configurações.
- Visitante não dispara `PUT /me` e vê o CTA de login.
- WhatsApp e Termos abrem links externos com fallback de erro.
- A versão exibida é a do `app.json` no formato `v1.0.0`.
- Lint, typecheck, testes e export verdes.

## Observação

`src/constants/support.ts` nasce com valores provisórios (número e URL) para
troca posterior sem tocar na tela.
