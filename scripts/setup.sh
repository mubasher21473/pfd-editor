#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Installing root dependencies (concurrently)..."
pnpm install

echo "==> Setting up .env files..."
[ ! -f apps/api/.env ] && cp apps/api/.env.example apps/api/.env && echo "    Created apps/api/.env"
[ ! -f apps/web/.env.local ] && cp apps/web/.env.local.example apps/web/.env.local && echo "    Created apps/web/.env.local"

echo "==> Installing API dependencies..."
cd apps/api
python -m venv .venv 2>/dev/null || true
source .venv/bin/activate 2>/dev/null || source apps/api/.venv/bin/activate 2>/dev/null || true
pip install -r requirements.txt -r requirements-dev.txt -q
cd "$ROOT"

echo "==> Installing frontend dependencies..."
cd apps/web
pnpm install
cd "$ROOT"

echo "==> Starting infrastructure (Redis, MinIO)..."
docker compose -f docker/docker-compose.yml up -d redis minio minio-setup

echo ""
echo "Setup complete! Run:"
echo "  pnpm dev        Start API + worker + frontend"
echo "  pnpm dev:all    Same but with infrastructure in foreground"
echo "  pnpm restart    Kill all services and restart with dev:all"
