#!/bin/sh
set -e

# Construtor autoritativo do REDIS_URL.
# O Compose interpola ${REDIS_PASSWORD} em parse-time (env_file é runtime),
# então REDIS_URL pode chegar vazio ou com segmento de senha vazio/malformado.
# Aqui reconstruímos a partir do runtime quando necessário.
redis_url_ok() {
  url="$1"
  [ -n "$url" ] || return 1
  # Forma esperada: redis://:<senha>@<host>:<porta>
  case "$url" in
    redis://:*@*) ;;
    *) return 1 ;;
  esac
  senha="${url#redis://:}"
  senha="${senha%%@*}"
  [ -n "$senha" ] || return 1
  return 0
}

if ! redis_url_ok "$REDIS_URL"; then
  if [ -z "$REDIS_PASSWORD" ]; then
    echo "[entrypoint] REDIS_PASSWORD ausente; REDIS_URL pode falhar" >&2
  fi
  export REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379"
fi

exec "$@"
