# Configurações Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir duas preferências de notificação e completar a tela Configurações com suporte, termos e versão.

**Architecture:** O backend ganha dois booleanos opcionais em `User.preferences`; a tela mobile carrega `/me`, alterna os switches com atualização otimista e envia sempre os dois valores. Links externos passam por `utils/links.ts` e constantes centralizadas.

**Tech Stack:** Expo SDK 58, React Native, Expo Router, Express 5 + Mongoose 9, zod, Vitest + supertest.

> **Sem commits nesta execução:** o AGENTS.md proíbe commits sem pedido explícito do usuário.

---

### Task 1: Backend — preferências de notificação

**Files:**
- Modify: `shared/domain.ts`
- Modify: `backend/src/types/dto.ts`
- Modify: `backend/src/models/user.model.ts`
- Test: `backend/src/types/dto.test.ts`
- Test: `backend/src/routes/users.test.ts`

- [ ] **Step 1: Write failing DTO tests**

Adicionar em `updateUserSchema`:

```ts
it('aceita as preferências de utilidade pública e vagas', () => {
  const parsed = updateUserSchema.parse({
    preferences: { publicUtilityAlerts: true, jobPostingAlerts: false },
  });

  expect(parsed.preferences?.publicUtilityAlerts).toBe(true);
  expect(parsed.preferences?.jobPostingAlerts).toBe(false);
});

it('rejeita preferência que não seja booleana', () => {
  const result = updateUserSchema.safeParse({
    preferences: { jobPostingAlerts: 'sim' },
  });

  expect(result.success).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/types/dto.test.ts`
Expected: FAIL porque os campos ainda não existem no schema.

- [ ] **Step 3: Implement types, DTO and model**

Em `shared/domain.ts`, `mobile/src/types/domain.ts` e `admin/src/types/domain.ts`:

```ts
preferences?: {
  notifications?: boolean;
  publicUtilityAlerts?: boolean;
  jobPostingAlerts?: boolean;
};
```

Em `backend/src/types/dto.ts`:

```ts
preferences: z
  .object({
    notifications: z.boolean().optional(),
    publicUtilityAlerts: z.boolean().optional(),
    jobPostingAlerts: z.boolean().optional(),
  })
  .optional(),
```

Em `backend/src/models/user.model.ts`:

```ts
preferences: {
  notifications: { type: Boolean, default: true },
  publicUtilityAlerts: { type: Boolean, default: true },
  jobPostingAlerts: { type: Boolean, default: true },
},
```

- [ ] **Step 4: Run DTO tests to verify they pass**

Run: `npm test -- --run src/types/dto.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing integration test**

Adicionar em `describe('PUT /api/me')`:

```ts
it('persiste as duas preferências de notificação', async () => {
  const response = await request(app)
    .put('/api/me')
    .set('Authorization', 'Bearer token_comum')
    .send({
      preferences: { publicUtilityAlerts: false, jobPostingAlerts: true },
    });

  expect(response.status).toBe(200);
  expect(response.body.preferences).toEqual({
    publicUtilityAlerts: false,
    jobPostingAlerts: true,
  });

  const usuario = modeloUsuarios.documents.find(
    (documento) => documento.clerkId === 'user_comum',
  );
  expect(usuario?.preferences).toEqual({
    publicUtilityAlerts: false,
    jobPostingAlerts: true,
  });
});
```

- [ ] **Step 6: Run integration test**

Run: `npm test -- --run src/routes/users.test.ts`
Expected: PASS após o DTO aceitar os campos.

- [ ] **Step 7: Run backend gates**

Run: `npm test && npm run typecheck && npm run lint`
Expected: tudo verde.

---

### Task 2: Mobile — tipos e constantes de suporte

**Files:**
- Modify: `mobile/src/types/domain.ts`
- Create: `mobile/src/constants/support.ts`

- [ ] **Step 1: Add support constants**

```ts
export const SUPPORT_WHATSAPP_PHONE = '5586999990000';
export const SUPPORT_WHATSAPP_MESSAGE =
  'Olá! Preciso de ajuda com o Guia Comercial.';
export const TERMS_URL = 'https://example.com/termos-de-uso';
```

- [ ] **Step 2: Update mobile User type**

```ts
preferences?: {
  notifications?: boolean;
  publicUtilityAlerts?: boolean;
  jobPostingAlerts?: boolean;
};
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

---

### Task 3: Mobile — tela Configurações

**Files:**
- Modify: `mobile/src/features/settings/settings-screen.tsx`

- [ ] **Step 1: Replace notification state**

```ts
const [publicUtilityAlerts, setPublicUtilityAlerts] = useState(
  user?.preferences?.publicUtilityAlerts ?? true,
);
const [jobPostingAlerts, setJobPostingAlerts] = useState(
  user?.preferences?.jobPostingAlerts ?? true,
);
```

- [ ] **Step 2: Load both preferences from `/me`**

No efeito existente, ler:

```ts
const loadedPublicUtility = me?.preferences?.publicUtilityAlerts;
const loadedJobPosting = me?.preferences?.jobPostingAlerts;
if (cancelled) return;
if (loadedPublicUtility !== undefined) setPublicUtilityAlerts(loadedPublicUtility);
if (loadedJobPosting !== undefined) setJobPostingAlerts(loadedJobPosting);
```

- [ ] **Step 3: Save both values**

```ts
async function savePreferences(next: {
  publicUtilityAlerts: boolean;
  jobPostingAlerts: boolean;
}) {
  setSaving(true);
  setError(null);

  try {
    const updated = await updateMe({
      preferences: {
        publicUtilityAlerts: next.publicUtilityAlerts,
        jobPostingAlerts: next.jobPostingAlerts,
      },
    });
    if (!updated && isApiConfigured()) {
      throw new Error('preferências não salvas');
    }
  } catch {
    setPublicUtilityAlerts(publicUtilityAlerts);
    setJobPostingAlerts(jobPostingAlerts);
    setError('Não foi possível salvar a preferência de notificações.');
  } finally {
    setSaving(false);
  }
}
```

Handlers otimistas:

```ts
function togglePublicUtility(value: boolean) {
  const anterior = publicUtilityAlerts;
  setPublicUtilityAlerts(value);
  void savePreferences({ publicUtilityAlerts: value, jobPostingAlerts })
    .catch(() => setPublicUtilityAlerts(anterior));
}
```

Aplicar o mesmo padrão para `toggleJobPosting`.

- [ ] **Step 4: Render two switches**

Substituir o card de notificação única por duas linhas com rótulos:

- “Avisos de utilidade pública” / “Saúde, coleta de lixo e comunicados.”
- “Novas vagas de emprego” / “Receba vagas publicadas no guia.”

Manter `ActivityIndicator` enquanto `loadingPreferences`; desabilitar quando
`state !== 'signedIn' || saving`. Manter link “Entre para ativar”.

- [ ] **Step 5: Add Suporte & Termos section**

```tsx
<Text style={styles.sectionTitle}>Suporte & Termos</Text>
<View style={styles.card}>
  <TouchableOpacity
    style={styles.row}
    onPress={() => void openWhatsApp(SUPPORT_WHATSAPP_PHONE, SUPPORT_WHATSAPP_MESSAGE)}
    accessibilityRole="button"
    accessibilityLabel="Ajuda e suporte via WhatsApp"
  >
    <View style={styles.rowIcon}>
      <Ionicons name="logo-whatsapp" size={20} color={colors.whatsapp} />
    </View>
    <View style={styles.rowBody}>
      <Text style={styles.rowLabel}>Ajuda & Suporte via WhatsApp</Text>
      <Text style={styles.rowHint}>Fale com a equipe do Guia Comercial.</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.row}
    onPress={() => void openExternalUrl(TERMS_URL, 'Termos de Uso e Privacidade')}
    accessibilityRole="button"
    accessibilityLabel="Abrir termos de uso e privacidade"
  >
    <View style={styles.rowIcon}>
      <Ionicons name="document-text-outline" size={20} color={colors.primary} />
    </View>
    <View style={styles.rowBody}>
      <Text style={styles.rowLabel}>Termos de Uso e Privacidade</Text>
      <Text style={styles.rowHint}>Consulte as regras e a política do app.</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
  </TouchableOpacity>
</View>
```

- [ ] **Step 6: Show version**

Atualizar a linha de versão para `Versão v{APP_VERSION}`.

- [ ] **Step 7: Run mobile gates**

Run: `npm run typecheck && npm run lint && npm test`
Expected: typecheck e testes verdes; lint sem erros novos.

- [ ] **Step 8: Bundle verification**

Run: `npx expo export --platform web --output-dir /tmp/opencode/guia-export-config`
Expected: export concluído.

---

### Task 4: Final verification

- [ ] **Step 1: Run all affected gates**

```bash
cd mobile && npm run typecheck && npm run lint && npm test
cd ../backend && npm test && npm run typecheck && npm run lint
```

- [ ] **Step 2: Review diff**

Run: `git diff --stat && git status --short`
Expected: apenas arquivos de Configurações, tipos, backend e docs.

- [ ] **Step 3: Report**

Informar mudanças, comandos/resultados, riscos (links provisórios, verificação
manual em device) e que nada foi commitado.
