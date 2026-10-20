const SECTIONS = [
  'Empresas',
  'Categorias',
  'Anúncios',
  'Banners',
  'Usuários',
];

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1 className="brand">Guia Comercial</h1>
        <p className="brand-sub">Painel Administrativo</p>
        <nav>
          <ul className="menu">
            {SECTIONS.map((section) => (
              <li key={section} className="menu-item">
                <span>{section}</span>
                <span className="badge">em breve</span>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="content">
        <h2>Estrutura inicial</h2>
        <p>
          O painel ainda não possui funcionalidades implementadas. As telas de
          gerenciamento serão conectadas à API em <code>/api</code> a partir da
          variável <code>VITE_API_URL</code>.
        </p>
      </main>
    </div>
  );
}
