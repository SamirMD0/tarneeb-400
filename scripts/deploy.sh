#!/usr/bin/env bash
# Phase 22: Build and deploy Tarneeb 400
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────
IMAGE_NAME="${DOCKER_IMAGE:-tarneeb-400}"
REGISTRY="${DOCKER_REGISTRY:-}"       # e.g. docker.io/username or 123456.dkr.ecr.us-east-1.amazonaws.com
TAG="${DEPLOY_TAG:-$(git rev-parse --short HEAD)}"
FULL_IMAGE="${REGISTRY:+${REGISTRY}/}${IMAGE_NAME}:${TAG}"

echo "╔══════════════════════════════════════════╗"
echo "║       Tarneeb 400 — Deploy Script        ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Image:    ${FULL_IMAGE}"
echo "Tag:      ${TAG}"
echo ""

# ── Step 1: Build ──────────────────────────────────────────────────────────────
echo "▶ Building Docker image..."
docker build -t "${FULL_IMAGE}" -f Backend/Dockerfile Backend/
echo "✅ Build complete"

# ── Step 2: Push ───────────────────────────────────────────────────────────────
if [ -n "${REGISTRY}" ]; then
    echo "▶ Pushing to registry..."
    docker push "${FULL_IMAGE}"
    # Also tag as latest
    docker tag "${FULL_IMAGE}" "${REGISTRY:+${REGISTRY}/}${IMAGE_NAME}:latest"
    docker push "${REGISTRY:+${REGISTRY}/}${IMAGE_NAME}:latest"
    echo "✅ Push complete"
else
    echo "⚠️  No DOCKER_REGISTRY set, skipping push"
fi

# ── Step 3: Run migrations ────────────────────────────────────────────────────
echo "▶ Running migrations..."
bash "$(dirname "$0")/migrate.sh"
echo "✅ Migrations complete"

# ── Step 4: Deploy ─────────────────────────────────────────────────────────────
echo "▶ Deploying..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --build
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    docker compose up -d --build
else
    echo "⚠️  docker-compose not found. Deploy manually:"
    echo "    docker run -d --env-file Backend/.env -p 5000:5000 ${FULL_IMAGE}"
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║         ✅ Deployment Complete!           ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Health check: curl http://localhost:5000/api/health"
