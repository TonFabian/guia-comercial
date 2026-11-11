import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'destructive';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-[#111827] font-semibold hover:opacity-90',
  secondary: 'bg-surface-hover text-text hover:bg-border',
  destructive: 'bg-danger/10 text-danger hover:bg-danger/20',
};

/** Botão com altura confortável em todas as variantes (spec: nada espremido). */
export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-10 items-center gap-2 rounded-(--radius-input) px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
