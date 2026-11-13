import { useAuth, useUser } from '@clerk/clerk-react';
import { useCallback, useEffect, useState } from 'react';

import { GateDenied, GateLoading, GateSignIn } from './components/auth-gate';
import { AtracoesSection } from './components/sections/atracoes';
import { AvisosSection } from './components/sections/avisos';
import { BannersSection } from './components/sections/banners';
import { CategoriasSection } from './components/sections/categorias';
import { CidadesSection } from './components/sections/cidades';
import { CuponsSection } from './components/sections/cupons';
import { EmpresasSection } from './components/sections/empresas';
import { EventosSection } from './components/sections/eventos';
import { NotificacoesSection } from './components/sections/notificacoes';
import { UsuariosSection } from './components/sections/usuarios';
import { UtilidadePublicaSection } from './components/sections/utilidade-publica';
import { VagasSection } from './components/sections/vagas';
import type { Section } from './components/sidebar';
import { MobileTopbar, Sidebar } from './components/sidebar';
import { Toaster } from 'sonner';
import { PageLoader } from './components/ui/loading';
import { getCategories, getCities, getCompanies, getMe, setTokenProvider } from './services/api';
import type { Catalog, CatalogErrors } from './types/catalog';

/** Catálogo vazio — evita `undefined` enquanto os dados de referência carregam. */
const EMPTY_CATALOG: Catalog = { categories: [], cities: [], companyOptions: [], companyOptionsTotal: 0 };

export default function App() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();

  const [section, setSection] = useState<Section>('Empresas');
  const [catalog, setCatalog] = useState<Catalog>(EMPTY_CATALOG);
  const [catalogErrors, setCatalogErrors] = useState<CatalogErrors>({});
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  // Gate de acesso: a role vem do backend (espelho local via GET /me), não do
  // metadata do Clerk — quem decide o que é admin é a API, nunca o frontend.
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // O token do Clerk expira em ~60s: registramos o provider (getToken do
  // Clerk devolve sempre o token válido/renovado) e esperamos a primeira
  // resolução antes de qualquer chamada autenticada.
  useEffect(() => {
    if (!isSignedIn) {
      setTokenProvider(null);
      setAuthReady(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setTokenProvider(() =>
        cancelled ? Promise.resolve(null) : getToken(),
      );
      await getToken();
      if (cancelled) return;
      setAuthReady(true);

      // Role só é resolvida DEPOIS do token: /me exige Authorization.
      const me = await getMe();
      if (cancelled) return;
      setRole(me?.role ?? null);
      setRoleLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken, user]);

  /**
   * Carrega os dados de referência (categorias, cidades e empresas usadas como
   * opção nos selects).
   *
   * Cada recurso é tratado por fora: uma falha em um deles não pode esvaziar
   * o painel inteiro — o erro aparece na seção que depende do recurso.
   */
  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);

    const [categories, cities, companies] = await Promise.allSettled([
      getCategories(1, 100),
      getCities(),
      getCompanies(1, 100),
    ]);

    const nextCatalog: Catalog = { categories: [], cities: [], companyOptions: [], companyOptionsTotal: 0 };
    const nextErrors: CatalogErrors = {};

    if (categories.status === 'fulfilled') {
      nextCatalog.categories = categories.value.items ?? [];
    } else {
      nextErrors.categories = messageOf(categories.reason);
    }

    if (cities.status === 'fulfilled') {
      nextCatalog.cities = cities.value;
    } else {
      nextErrors.cities = messageOf(cities.reason);
    }

    if (companies.status === 'fulfilled') {
      nextCatalog.companyOptions = companies.value.items ?? [];
      nextCatalog.companyOptionsTotal = companies.value.total ?? 0;
    } else {
      nextErrors.companyOptions = messageOf(companies.reason);
    }

    setCatalog(nextCatalog);
    setCatalogErrors(nextErrors);
    setCatalogLoading(false);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    void loadCatalog();
  }, [authReady, loadCatalog]);

  if (!isLoaded) return <GateLoading />;
  if (!isSignedIn) return <GateSignIn />;

  // Defesa de acesso: só role `admin` (definida no backend) abre o painel.
  // Usuário comum logado vê tela de acesso negado — nada de listagens, nem
  // formulários, nem tentativa de mutação.
  if (!roleLoaded) return <GateLoading />;
  if (role !== 'admin') return <GateDenied />;

  return (
    <div className="flex min-h-[100dvh] bg-bg text-text">
      <Sidebar active={section} onChange={setSection} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopbar section={section} onMenu={() => setMenuOpen(true)} />
        <main className="min-w-0 flex-1 p-4 md:p-6" style={{ paddingBottom: 'max(4rem, calc(env(safe-area-inset-bottom) + 1.5rem))' }}>
          {/* Título global da seção: visível nas telas de listagem; no modo
              formulário é escondido via CSS (:has), pois a tela de edição tem
              o próprio "← Seção" + "Editar/Criar ..." — sem duplicação. */}
          <h1
            className="section-title mb-4 hidden text-xl font-semibold text-text md:block"
            style={{ fontFamily: 'var(--font-family-heading)' }}
          >
            {section}
          </h1>
          {/* authReady evita loader eterno quando o catálogo não dispara (ex.: sem sessão).
              Enquanto o catálogo carrega, loading centralizado na tela (mobile-first);
              as seções ficam montadas porém ocultas — os fetches delas continuam em paralelo. */}
          {catalogLoading && authReady && <PageLoader label="Carregando dados de referência…" />}

          <div className={catalogLoading && authReady ? 'hidden' : undefined}>
          {section === 'Empresas' && (
          <EmpresasSection
            categories={catalog.categories}
            categoriesError={catalogErrors.categories ?? null}
            cities={catalog.cities}
            citiesError={catalogErrors.cities ?? null}
          />
        )}
        {section === 'Categorias' && <CategoriasSection />}
        {section === 'Cidades' && (
          <CidadesSection
            cities={catalog.cities}
            citiesError={catalogErrors.cities ?? null}
            onReload={() => void loadCatalog()}
          />
        )}
        {section === 'Banners' && <BannersSection />}
        {section === 'Cupons' && (
          <CuponsSection
            companies={catalog.companyOptions}
            companiesTotal={catalog.companyOptionsTotal}
            companiesError={catalogErrors.companyOptions ?? null}
          />
        )}
        {section === 'Vagas' && (
          <VagasSection
            companies={catalog.companyOptions}
            companiesTotal={catalog.companyOptionsTotal}
            companiesError={catalogErrors.companyOptions ?? null}
          />
        )}
        {section === 'Avisos' && <AvisosSection />}
        {section === 'Utilidade Pública' && (
          <UtilidadePublicaSection
            cities={catalog.cities}
            citiesError={catalogErrors.cities ?? null}
          />
        )}
        {section === 'Atrações' && (
          <AtracoesSection
            cities={catalog.cities}
            citiesError={catalogErrors.cities ?? null}
            companies={catalog.companyOptions}
            companiesTotal={catalog.companyOptionsTotal}
            companiesError={catalogErrors.companyOptions ?? null}
          />
        )}
        {section === 'Eventos' && (
          <EventosSection
            cities={catalog.cities}
            citiesError={catalogErrors.cities ?? null}
            companies={catalog.companyOptions}
            companiesTotal={catalog.companyOptionsTotal}
            companiesError={catalogErrors.companyOptions ?? null}
          />
        )}
        {section === 'Notificações' && <NotificacoesSection />}
        {section === 'Usuários' && <UsuariosSection />}
          </div>
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </main>
      </div>
    </div>
  );
}

/** Converte um motivo de rejeição em mensagem exibível. */
function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}
