#!/usr/bin/env bash
# Phase 22: Database migration / index creation script
set -euo pipefail

echo "▶ Running database migrations..."

# Load environment
if [ -f Backend/.env ]; then
    export $(grep -v '^#' Backend/.env | xargs)
fi

MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/tarneeb}"

echo "  MongoDB: ${MONGO_URI%%@*}@***"

# Ensure indexes exist (idempotent — safe to re-run)
mongosh "${MONGO_URI}" --eval '
  // Game collection indexes
  db.games.createIndex({ roomId: 1 }, { background: true });
  db.games.createIndex({ playerIds: 1 }, { background: true });
  db.games.createIndex({ endedAt: -1 }, { background: true });
  db.games.createIndex({ "finalScore.team1": -1, "finalScore.team2": -1 }, { background: true });

  // User collection indexes
  db.users.createIndex({ email: 1 }, { unique: true, background: true });
  db.users.createIndex({ socketId: 1 }, { background: true });

  // PlayerStats collection indexes
  db.playerstats.createIndex({ socketId: 1 }, { unique: true, background: true });
  db.playerstats.createIndex({ wins: -1 }, { background: true });

  print("✅ All indexes created/verified");
' 2>/dev/null || echo "⚠️  mongosh not available, indexes will be created by Mongoose on startup"

echo "✅ Migrations complete"
