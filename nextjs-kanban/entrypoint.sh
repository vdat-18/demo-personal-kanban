#!/bin/sh
set -e

echo "Pushing database schema..."
node ./node_modules/prisma/build/index.js db push --accept-data-loss

echo "Starting Next.js..."
if [ "$#" -gt 0 ]; then
  exec "$@"
else
  exec node server.js
fi
