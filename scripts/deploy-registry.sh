#!/bin/bash
# Deploy registry to aomi.dev/r production
# Usage: pnpm run deploy:registry

set -e

echo "Building registry..."
pnpm run build:registry

echo "Copying to public/r..."
mkdir -p apps/landing/public/r
cp -r apps/registry/dist/. apps/landing/public/r/

echo "Deploying to Vercel production..."
vercel --prod --scope aomi-labs

echo "Done! Registry deployed to aomi.dev/r"
