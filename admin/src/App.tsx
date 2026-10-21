import { Sidebar } from './components/sidebar';

export default function App() {
  return (
    <div className="layout">
      <Sidebar />
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
