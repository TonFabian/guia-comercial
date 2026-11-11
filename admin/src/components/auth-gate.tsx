import { SignInButton, SignOutButton } from '@clerk/clerk-react';

export function GateLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-[--radius-card] border border-border bg-surface p-10 text-center shadow-[--shadow-card]">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary" />
        <h1 className="text-xl font-semibold text-primary" style={{ fontFamily: 'var(--font-family-heading)' }}>
          Carregando
        </h1>
        <p className="text-sm text-text-muted">Verificando sua sessão e permissões…</p>
      </div>
    </div>
  );
}

export function GateDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-[--radius-card] border border-border bg-surface p-10 text-center shadow-[--shadow-card]">
        <div className="text-3xl">🔒</div>
        <h1 className="text-xl font-semibold text-primary" style={{ fontFamily: 'var(--font-family-heading)' }}>
          Acesso restrito
        </h1>
        <p className="text-sm text-text-muted">Este painel é exclusivo de administradores da plataforma.</p>
        <SignOutButton>
          <button className="mt-2 inline-flex h-10 items-center gap-2 rounded-[--radius-input] bg-surface-hover px-4 text-sm text-text">
            Sair
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}

export function GateSignIn() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-[--radius-card] border border-border bg-surface p-10 text-center shadow-[--shadow-card]">
        <div className="text-3xl">🔐</div>
        <h1 className="text-xl font-semibold text-primary" style={{ fontFamily: 'var(--font-family-heading)' }}>
          Painel Administrativo
        </h1>
        <p className="text-sm text-text-muted">Faça login para continuar.</p>
        <SignInButton mode="modal">
          <button className="mt-2 inline-flex h-10 items-center gap-2 rounded-[--radius-input] bg-primary px-4 text-sm font-semibold text-[#111827]">
            Entrar
          </button>
        </SignInButton>
      </div>
    </div>
  );
}
