#!/bin/sh
set -e

echo "Pushing database schema..."
node ./node_modules/prisma/build/index.js db push --accept-data-loss

echo "Starting Next.js server..."
exec node server.js
