# Limpeza de Duplicidades — Home, Perfil e Configurações

## Intent

Eliminar repetições de conteúdo e atalhos duplicados entre a Home, o Perfil e
as Configurações, sem alterar navegação além do necessário. A Home deixa de
repetir a empresa em destaque; o Perfil mantém o login apenas no banner
amarelo; Configurações deixa de duplicar o atalho de “Minha empresa”.

## Escopo

- **In scope:**
  - Filtrar a lista “Outras Empresas & Serviços Locais” para excluir a
    empresa exibida em “Empresas em Destaque”.
  - Remover a linha “Entrar ou cadastrar” do menu do Perfil no modo Visitante.
  - Remover a seção “Minha empresa” de Configurações.
  - Preservar a hierarquia do Perfil: header/avatar + banner (Visitante),
    menu principal e card de tema.
  - Testes puros para o filtro da Home e para a composição do menu do Perfil.
- **Out of scope:**
  - Alterar o banner amarelo, o modal de saída ou o tema.
  - Mudar a API, os mocks ou o backend.
  - Esconder “Meus dados”/“Minha empresa” no modo Visitante.
  - Redesenhar Configurações ou o fluxo de autenticação.

## Decisões

| Tema | Decisão |
| --- | --- |
| Filtro da Home | Função pura `excludeFeaturedCompany(companies, featured)` em `home-companies.ts`, usada com `useMemo` na HomeScreen. |
| Critério de exclusão | Comparar `_id` da empresa em destaque exibida com `_id` da lista secundária. |
| Destaque ausente | Sem `featuredCompany`, a lista secundária permanece inalterada. |
| Menu do Perfil | Extrair `buildMenu` para `profile-menu.ts`, sem o item `entrar`. |
| Visitante | Menu com “Meus dados”, “Minha empresa” e “Configurações”; os dois primeiros continuam abrindo o sign-in. |
| Logado | Os três itens + “Sair”. |
| Configurações | Remover apenas a seção “Minha empresa”; suporte, termos, notificações e tema ficam iguais. |

## Arquitetura

```
mobile/src/
  features/home/
    home-companies.ts          → filtro puro (novo)
    home-companies.test.ts     → testes (novo)
    other-companies.tsx        → inalterado
  app/(tabs)/index.tsx         → aplica o filtro na lista secundária
  features/profile/
    profile-menu.ts            → menu puro (novo)
    profile-menu.test.ts       → testes (novo)
    profile-screen.tsx         → consome o menu, remove o caso 'entrar'
  features/settings/
    settings-screen.tsx        → remove a seção “Minha empresa”
```

## Fluxo da Home

1. `useHomeData` obtém `featuredCompany`.
2. O efeito de empresas obtém `otherCompanies`.
3. A Home calcula:
   ```ts
   const visibleOtherCompanies = useMemo(
     () => excludeFeaturedCompany(otherCompanies, featuredCompany),
     [otherCompanies, featuredCompany],
   );
   ```
4. `OtherCompanies` recebe apenas `visibleOtherCompanies`.
5. Se o destaque for nulo ou não estiver na lista, nada é removido.

## Fluxo do Perfil

1. `buildMenu(state)` retorna os itens fixos:
   - `meus-dados` — “Meus dados”
   - `minha-empresa` — “Minha empresa”
   - `configuracoes` — “Configurações”
2. Se `state === 'signedIn'`, acrescenta `sair` — “Sair”.
3. O tipo `MenuItemId` não inclui mais `entrar`.
4. `handleMenuPress` remove o caso `entrar`.
5. No Visitante, “Meus dados” e “Minha empresa” chamam
   `router.push('/(auth)/sign-in')`; o banner amarelo continua sendo o CTA
   explícito de login/cadastro.
6. A ordem visual permanece: título, header, eventual loading, menu, tema.

## Fluxo de Configurações

1. Remover o bloco `<Text>Minha empresa</Text>` e o card com o botão
   “Abrir minha empresa”.
2. O atalho continua disponível no menu principal do Perfil.
3. Nenhum estado, efeito ou chamada de API de Configurações muda.

## Testes

- `home-companies.test.ts`:
  - remove a empresa em destaque da lista secundária;
  - mantém a lista intacta quando não há destaque;
  - preserva a ordem e os demais itens;
  - não remove duplicata por nome, apenas por `_id`.
- `profile-menu.test.ts`:
  - Visitante não recebe `entrar`;
  - Visitante recebe `meus-dados`, `minha-empresa`, `configuracoes`;
  - logado recebe os três + `sair`;
  - `signedOut`/`loading` não recebem `sair`.
- Gates: `npm run typecheck`, `npm run lint`, `npm test` e `expo export` no
  mobile.

## Acessibilidade

- Os itens removidos não deixam foco pendente.
- O banner amarelo continua com `accessibilityRole="button"` e label
  “Entrar ou cadastrar”.
- A lista da Home mantém labels por empresa.

## Critérios de aceite

- A empresa em destaque não aparece em “Outras Empresas & Serviços Locais”.
- O menu do Visitante não exibe “Entrar ou cadastrar”.
- O login do Visitante é oferecido pelo banner amarelo; “Meus dados” e
  “Minha empresa” levam ao sign-in.
- “Sair” aparece apenas logado.
- Configurações não exibe mais a seção “Minha empresa”.
- O menu do Perfil mantém a ordem “Meus dados”, “Minha empresa”,
  “Configurações”, “Sair”.
