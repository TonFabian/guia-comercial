import { SignInButton, SignOutButton } from '@clerk/clerk-react';

/**
 * Telas de gate do painel: carregando sessão/role, acesso restrito e login.
 * Renderizam tela cheia centrada, fora do layout do painel — nada de seções
 * parcialmente montadas enquanto o acesso ainda não foi decidido.
 */

interface GateProps {
  title: string;
  text: string;
  icon?: string;
  children?: React.ReactNode;
}

function GateCard({ title, text, icon, children }: GateProps) {
  return (
    <div className="gate">
      <div className="gate-card">
        {icon && <div className="gate-icon">{icon}</div>}
        <div className="gate-title">{title}</div>
        <p className="gate-text">{text}</p>
        {children}
      </div>
    </div>
  );
}

/** Sessão/role ainda não resolvidas. */
export function GateLoading() {
  return (
    <GateCard title="Carregando" text="Verificando sua sessão e permissões…">
      <div className="gate-spinner" aria-hidden="true" />
    </GateCard>
  );
}

/** Usuário autenticado, mas sem role admin no backend. */
export function GateDenied() {
  return (
    <GateCard title="Acesso restrito" icon="🔒" text="Este painel é exclusivo de administradores da plataforma.">
      <SignOutButton>
        <button>Sair</button>
      </SignOutButton>
    </GateCard>
  );
}

/** Sem sessão: convite ao login. */
export function GateSignIn() {
  return (
    <GateCard title="Painel Administrativo" icon="🔐" text="Faça login para continuar.">
      <SignInButton mode="modal">
        <button>Entrar</button>
      </SignInButton>
    </GateCard>
  );
}
