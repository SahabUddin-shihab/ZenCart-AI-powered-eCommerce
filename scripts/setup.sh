#!/bin/bash
set -e

if ! command -v node &> /dev/null; then
  echo "Node.js 18+ is required."
  exit 1
fi

NODE_VERSION=$(node -v | cut -d. -f1 | tr -d 'v')

if [ "$NODE_VERSION" -lt 18 ]; then
  echo "Node.js 18+ is required. Current: $(node -v)"
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

npm install

npx prisma generate

echo "Setup complete."
echo "Update .env, then run:"
echo "docker-compose up -d postgres redis meilisearch"
echo "npm run prisma:migrate"
echo "npm run prisma:seed"
echo "npm run start:dev"