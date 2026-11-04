import { searchInputStyle } from './styles';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Campo de busca que filtra no cliente os itens já carregados. */
export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <input
      type="search"
      style={searchInputStyle}
      placeholder={placeholder ?? 'Buscar…'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={placeholder ?? 'Buscar'}
    />
  );
}
