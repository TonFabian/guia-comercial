#!/usr/bin/env bash
# Sobe a stack de desenvolvimento (mongo + backend + admin) em Docker.
# Funciona em terminal novo mesmo quando o grupo docker ainda não está ativo:
# reexecuta o próprio script via `sg docker`, sem usar sudo.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! docker info >/dev/null 2>&1; then
  if command -v sg >/dev/null 2>&1; then
    exec sg docker -c "$(printf '%q ' "$0" "$@")"
  fi
  echo "Sem acesso ao Docker. Adicione seu usuário ao grupo docker." >&2
  exit 1
fi

cd "$ROOT_DIR"

docker compose up -d --build mongo backend admin

for _ in $(seq 1 60); do
  if curl -fsS http://localhost:5173/ >/dev/null 2>&1; then
    echo "Admin disponível em http://localhost:5173"
    exit 0
  fi
  sleep 1
done

echo "Admin ainda não respondeu; veja: docker compose logs -f admin" >&2
exit 1
