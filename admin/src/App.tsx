import { useCallback, useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';

import { GateDenied, GateLoading, GateSignIn } from './components/auth-gate';
import { Sidebar } from './components/sidebar';
import type { Section } from './components/sidebar';
import { AtracoesSection } from './components/sections/atracoes';
import { AvisosSection } from './components/sections/avisos';
import { BannersSection } from './components/sections/banners';
import { CategoriasSection } from './components/sections/categorias';
import { CidadesSection } from './components/sections/cidades';
import { CuponsSection } from './components/sections/cupons';
import { EmpresasSection } from './components/sections/empresas';
import { EventosSection } from './components/sections/eventos';
import { UsuariosSection } from './components/sections/usuarios';
import { UtilidadePublicaSection } from './components/sections/utilidade-publica';
import { VagasSection } from './components/sections/vagas';
import { hintStyle } from './components/styles';
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
    <div className="layout">
      <Sidebar active={section} onChange={setSection} />
      <main className="content">
        <h2>{section}</h2>
        {catalogLoading && <p style={hintStyle}>Carregando dados de referência…</p>}

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
        {section === 'Usuários' && <UsuariosSection />}
      </main>
    </div>
  );
}

/** Converte um motivo de rejeição em mensagem exibível. */
function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}
