interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…' }: SearchInputProps) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-(--radius-input) border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
    />
  );
}
