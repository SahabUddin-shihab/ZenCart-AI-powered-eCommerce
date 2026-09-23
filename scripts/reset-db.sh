#!/bin/bash
set -e

npx prisma migrate reset --force
npm run prisma:seed

echo "Database reset and seeded."