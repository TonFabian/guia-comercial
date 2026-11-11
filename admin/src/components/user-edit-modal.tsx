import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { getCities, updateUserProfile, updateUserRole } from '../services/api';
import type { AdminUserListItem } from '../services/api';
import { citySlug } from '../utils/labels';
import { Button } from './ui/button';
import { Field, Input, Select } from './ui/input';
import { deleteButtonClass } from './delete-button';

export interface UserEditModalProps {
  user: AdminUserListItem;
  /** true quando a linha é a conta do admin logado (role não editável). */
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Modal de edição de perfil do usuário (admin).
 *
 * Concentra nome, cidade e perfil (role) em um só lugar — em vez de mais um
 * botão solto na linha da tabela. Escape e backdrop fecham sem salvar; o
 * botão "Salvar" aplica as alterações (role é bloqueada na própria conta,
 * com o motivo visível no campo).
 */
export function UserEditModal({ user, isSelf, onClose, onSaved }: UserEditModalProps) {
  const [nome, setNome] = useState(user.name ?? '');
  const [role, setRole] = useState<'user' | 'admin'>(user.role);
  const [city, setCity] = useState(() => citySlugAtual(user));
  const [cities, setCities] = useState<{ slug: string; name: string; state: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCities()
      .then((lista) => {
        if (!cancelled) setCities(lista);
      })
      .catch(() => {
        // Sem cidades o select fica só com "Sem cidade" — não bloqueia o modal.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Escape fecha — sem salvar (padrão do ConfirmDialog).
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const partes = nome.trim().split(/\s+/);
      const firstName = partes[0] ?? '';
      const lastName = partes.slice(1).join(' ');

      const nomeMudou = nome.trim() !== (user.name ?? '');
      const cidadeMudou = city !== citySlugAtual(user);
      const roleMudou = role !== user.role;

      if (nomeMudou || cidadeMudou) {
        await updateUserProfile(user._id, {
          ...(nomeMudou ? { firstName, lastName } : {}),
          ...(cidadeMudou ? { city: city || null } : {}),
        });
      }
      if (roleMudou) {
        await updateUserRole(user._id, role);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Editar usuário ${user.name ?? user.email}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-(--radius-card) border border-border bg-surface p-5 shadow-(--shadow-card)"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-text" style={{ fontFamily: 'var(--font-family-heading)' }}>
          Editar usuário
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <Field label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do usuário" />
          </Field>

          <Field label="E-mail">
            <Input value={user.email} disabled readOnly />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Perfil">
              <Select value={role} onChange={(e) => setRole(e.target.value as 'user' | 'admin')} disabled={isSelf}>
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </Select>
            </Field>

            <Field label="Cidade">
              <Select value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">Sem cidade</option>
                {cities.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name} — {c.state}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {isSelf && (
            <p className="text-xs text-text-muted">
              Você não pode alterar o próprio perfil de acesso — peça a outro
              administrador.
            </p>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="submit" disabled={saving}>
              Salvar
            </Button>
            <button type="button" onClick={onClose} className={deleteButtonClass('cancel')}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Slug da cidade atual do usuário (a listagem traz a cidade populada). */
function citySlugAtual(user: AdminUserListItem): string {
  return citySlug(user.city, []);
}
