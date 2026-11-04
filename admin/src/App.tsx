import { useEffect, useState } from 'react';
import { SignInButton, useAuth, useUser } from '@clerk/clerk-react';

import { Sidebar } from './components/sidebar';
import {
  createBanner,
  createCategory,
  createCompany,
  createCoupon,
  createJob,
  createNotice,
  deleteBanner,
  deleteCategory,
  deleteCompany,
  deleteCoupon,
  deleteJob,
  deleteNotice,
  getBanners,
  getCategories,
  getCompanies,
  getCoupons,
  getJobs,
  getNotices,
  getUsers,
  setAuthToken,
} from './services/api';
import type { AdminUser, Banner, Category, Company, Coupon, Job, Notice } from './types/domain';

type Section = 'Empresas' | 'Categorias' | 'Banners' | 'Cupons' | 'Vagas' | 'Avisos' | 'Usuários';

export default function App() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isSignedIn) {
      setAuthToken(null);
      return;
    }
    (async () => {
      const token = await getToken();
      setAuthToken(token ?? null);
    })();
  }, [isSignedIn, getToken, user]);

  if (!isLoaded) return <p>Carregando…</p>;
  if (!isSignedIn) {
    return (
      <div className="layout">
        <main className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <h2>Painel Administrativo</h2>
          <p>Faça login para continuar.</p>
          <SignInButton mode="modal">
            <button>Entrar</button>
          </SignInButton>
        </main>
      </div>
    );
  }

  const [section, setSection] = useState<Section>('Empresas');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [c, cat, b, cp, j, u, n] = await Promise.all([
        getCompanies(1),
        getCategories(),
        getBanners(),
        getCoupons(),
        getJobs(),
        getUsers(),
        getNotices(),
      ]);
      setCompanies(c.items ?? []);
      setCategories(cat.items ?? []);
      setBanners(b.items ?? []);
      setCoupons(cp.items ?? []);
      setJobs(j.items ?? []);
      setUsers(u.items ?? []);
      setNotices(n.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function remove(kind: string, id: string) {
    if (!confirm(`Excluir ${kind}?`)) return;
    try {
      if (kind === 'empresa') await deleteCompany(id);
      else if (kind === 'categoria') await deleteCategory(id);
      else if (kind === 'banner') await deleteBanner(id);
      else if (kind === 'cupom') await deleteCoupon(id);
      else if (kind === 'vaga') await deleteJob(id);
      else if (kind === 'aviso') await deleteNotice(id);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="layout">
      <Sidebar active={section} onChange={setSection} />
      <main className="content">
        <h2>{section}</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {loading ? (
          <p>Carregando…</p>
        ) : (
          <>
            {section === 'Empresas' && (
              <EmpresasSection
                companies={companies}
                categories={categories}
                onReload={loadAll}
                onDelete={(id: string) => remove('empresa', id)}
                setError={setError}
              />
            )}
            {section === 'Categorias' && (
              <CategoriasSection
                categories={categories}
                onReload={loadAll}
                onDelete={(id: string) => remove('categoria', id)}
                setError={setError}
              />
            )}
            {section === 'Banners' && (
              <BannersSection
                banners={banners}
                onReload={loadAll}
                onDelete={(id: string) => remove('banner', id)}
                setError={setError}
              />
            )}
            {section === 'Cupons' && (
              <CuponsSection
                coupons={coupons}
                companies={companies}
                onReload={loadAll}
                onDelete={(id: string) => remove('cupom', id)}
                setError={setError}
              />
            )}
            {section === 'Vagas' && (
              <VagasSection
                jobs={jobs}
                companies={companies}
                onReload={loadAll}
                onDelete={(id: string) => remove('vaga', id)}
                setError={setError}
              />
            )}
            {section === 'Avisos' && (
              <AvisosSection
                notices={notices}
                onReload={loadAll}
                onDelete={(id: string) => remove('aviso', id)}
                setError={setError}
              />
            )}
            {section === 'Usuários' && <UsuariosSection users={users} />}
          </>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empresas
// ---------------------------------------------------------------------------

function EmpresasSection({ companies, categories, onReload, onDelete, setError }: any) {
  const [form, setForm] = useState({ name: '', slug: '', description: '', category: '', city: '' });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCompany({ ...form });
      setForm({ name: '', slug: '', description: '', category: '', city: '' });
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <form onSubmit={handleCreate} style={formStyle}>
        <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
        <input placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
          <option value="">Categoria</option>
          {categories.map((c: Category) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <input placeholder="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <button type="submit">Criar</button>
      </form>
      <Table
        headers={['Nome', 'Categoria', 'Cidade', 'Ações']}
        rows={companies.map((c: Company) => [
          c.name,
          typeof c.category === 'string' ? c.category : c.category?.name,
          c.city ?? '—',
          <button key={c._id} onClick={() => onDelete(c._id)}>Excluir</button>,
        ])}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

function CategoriasSection({ categories, onReload, onDelete, setError }: any) {
  const [form, setForm] = useState({ name: '', slug: '', icon: '', order: 0 });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCategory({ name: form.name, slug: form.slug, icon: form.icon, order: form.order });
      setForm({ name: '', slug: '', icon: '', order: 0 });
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <form onSubmit={handleCreate} style={formStyle}>
        <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
        <input placeholder="Ícone" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
        <input type="number" placeholder="Ordem" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
        <button type="submit">Criar</button>
      </form>
      <Table
        headers={['Nome', 'Slug', 'Ações']}
        rows={categories.map((c: Category) => [c.name, c.slug, <button key={c._id} onClick={() => onDelete(c._id)}>Excluir</button>])}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

function BannersSection({ banners, onReload, onDelete, setError }: any) {
  const [form, setForm] = useState({ title: '', image: '', link: '' });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createBanner({ title: form.title, image: form.image, link: form.link });
      setForm({ title: '', image: '', link: '' });
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <form onSubmit={handleCreate} style={formStyle}>
        <input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input placeholder="URL da imagem" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
        <input placeholder="Link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
        <button type="submit">Criar</button>
      </form>
      <Table
        headers={['Título', 'Ações']}
        rows={banners.map((b: Banner) => [b.title, <button key={b._id} onClick={() => onDelete(b._id)}>Excluir</button>])}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Cupons
// ---------------------------------------------------------------------------

function CuponsSection({ coupons, companies, onReload, onDelete, setError }: any) {
  const [form, setForm] = useState({ code: '', discount: '', company: '' });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCoupon({ code: form.code, discount: form.discount, company: form.company });
      setForm({ code: '', discount: '', company: '' });
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <form onSubmit={handleCreate} style={formStyle}>
        <input placeholder="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
        <input placeholder="Desconto" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
        <select value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required>
          <option value="">Empresa</option>
          {companies.map((c: Company) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <button type="submit">Criar</button>
      </form>
      <Table
        headers={['Código', 'Desconto', 'Ações']}
        rows={coupons.map((c: Coupon) => [c.code, `${c.discount}%`, <button key={c._id} onClick={() => onDelete(c._id)}>Excluir</button>])}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Vagas
// ---------------------------------------------------------------------------

function VagasSection({ jobs, companies, onReload, onDelete, setError }: any) {
  const [form, setForm] = useState({ title: '', company: '', description: '', location: '', type: 'CLT' });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createJob({ title: form.title, company: form.company, description: form.description, location: form.location, type: form.type });
      setForm({ title: '', company: '', description: '', location: '', type: 'CLT' });
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <form onSubmit={handleCreate} style={formStyle}>
        <input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <select value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required>
          <option value="">Empresa</option>
          {companies.map((c: Company) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <input placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input placeholder="Localização" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="CLT">CLT</option>
          <option value="Part-time">Meio período</option>
        </select>
        <button type="submit">Criar</button>
      </form>
      <Table
        headers={['Título', 'Empresa', 'Localização', 'Ações']}
        rows={jobs.map((j: Job) => [
          j.title,
          typeof j.company === 'string' ? j.company : j.company?.name,
          j.location ?? '—',
          <button key={j._id} onClick={() => onDelete(j._id)}>Excluir</button>,
        ])}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Avisos
// ---------------------------------------------------------------------------

function AvisosSection({ notices, onReload, onDelete, setError }: any) {
  const [form, setForm] = useState({ title: '', body: '', type: 'general' as 'general' | 'alert' | 'health' });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createNotice({ title: form.title, body: form.body, type: form.type });
      setForm({ title: '', body: '', type: 'general' });
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <form onSubmit={handleCreate} style={formStyle}>
        <input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <textarea placeholder="Texto do aviso" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required style={{ minWidth: 300, minHeight: 60 }} />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'general' | 'alert' | 'health' })}>
          <option value="general">Geral</option>
          <option value="alert">Alerta</option>
          <option value="health">Saúde</option>
        </select>
        <button type="submit">Criar</button>
      </form>
      <Table
        headers={['Título', 'Tipo', 'Ações']}
        rows={notices.map((n: Notice) => [n.title, n.type, <button key={n._id} onClick={() => onDelete(n._id)}>Excluir</button>])}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Usuários (somente leitura)
// ---------------------------------------------------------------------------

function UsuariosSection({ users }: any) {
  return (
    <Table
      headers={['Nome', 'E-mail', 'Role']}
      rows={users.map((u: AdminUser) => [
        u.name ?? '—',
        u.email,
        u.role,
      ])}
    />
  );
}

// ---------------------------------------------------------------------------
// Tabela genérica
// ---------------------------------------------------------------------------

function Table({ headers, rows }: { headers: string[]; rows: (string | number | React.ReactNode)[][] }) {
  return (
    <table>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const formStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginBottom: 24,
  alignItems: 'center',
};