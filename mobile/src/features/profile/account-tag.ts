export type AccountTag = 'Cidadão' | 'Empresa Parceira';

/** Deriva o selo do perfil; `null` significa posse ainda desconhecida. */
export function resolveAccountTag(hasOwnedCompany: boolean | null): AccountTag | null {
  if (hasOwnedCompany === null) {
    return null;
  }

  return hasOwnedCompany ? 'Empresa Parceira' : 'Cidadão';
}
