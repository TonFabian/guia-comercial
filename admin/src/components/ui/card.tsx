import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** Superfície elevada do dark console (card). */
export function Card({ children, className = '' }: CardProps) {
  return (
    <section className={`rounded-[--radius-card] border border-border bg-surface p-4 shadow-[--shadow-card] ${className}`}>
      {children}
    </section>
  );
}
