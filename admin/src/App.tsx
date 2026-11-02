import { useEffect, useState } from 'react';

import { Sidebar } from './components/sidebar';
import { createCompany, deleteCompany, getCategories, getCompanies } from './services/api';
import type { Category, Company } from './types/domain';

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    category: '',
    city: '',
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [c, cat] = await Promise.all([getCompanies(1), getCategories()]);
      setCompanies(c.items ?? []);
      setCategories(cat.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCompany({
        name: form.name,
        slug: form.slug,
        description: form.description,
        category: form.category,
        city: form.city,
      });
      setForm({ name: '', slug: '', description: '', category: '', city: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir empresa?')) return;
    try {
      await deleteCompany(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="content">
        <h2>Empresas</h2>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <form onSubmit={handleCreate} style={{ marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required
          />
          <input
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          >
            <option value="">Categoria</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Cidade"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <button type="submit">Criar</button>
        </form>

        {loading ? (
          <p>Carregando…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Cidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>
                  <td>{typeof c.category === 'string' ? c.category : c.category?.name}</td>
                  <td>{c.city}</td>
                  <td>
                    <button onClick={() => handleDelete(c._id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}