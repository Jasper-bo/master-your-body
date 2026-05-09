#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo ""

# ── 1. Check Node.js version ──────────────────────────────────────────
echo "==> Checking Node.js..."
NODE_VERSION=$(node -v 2>/dev/null || echo "none")
if [ "$NODE_VERSION" = "none" ]; then
  echo "ERROR: Node.js is not installed. Please install Node.js 18.17+ from https://nodejs.org"
  exit 1
fi

MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
if [ "$MAJOR" -lt 18 ]; then
  echo "ERROR: Node.js >= 18.17 required. Current: $NODE_VERSION"
  exit 1
fi
echo "  OK: $NODE_VERSION"

# ── 2. Install dependencies ────────────────────────────────────────────
echo ""
echo "==> Installing dependencies..."
npm install

# ── 3. Create .env.local if missing ────────────────────────────────────
echo ""
if [ ! -f .env.local ]; then
  echo "==> Creating .env.local with secure random secrets..."
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

  cp .env.example .env.local

  # macOS sed requires '' after -i; GNU sed doesn't. Handle both.
  SED_INPLACE=(-i)
  if [[ "$(uname -s)" == "Darwin" ]]; then
    SED_INPLACE=(-i '')
  fi

  sed "${SED_INPLACE[@]}" "s/JWT_SECRET=\"replace-with-32-bytes-or-longer-random-secret\"/JWT_SECRET=\"$JWT_SECRET\"/" .env.local
  sed "${SED_INPLACE[@]}" "s/JWT_REFRESH_SECRET=\"replace-with-different-32-bytes-or-longer-random-secret\"/JWT_REFRESH_SECRET=\"$JWT_REFRESH_SECRET\"/" .env.local

  echo "  OK: .env.local created"
else
  echo "==> .env.local already exists, skipping"
fi

# ── 4. Initialize database ─────────────────────────────────────────────
echo ""
echo "==> Initializing database..."
if grep -q "\[PROJECT\]" .env.local 2>/dev/null; then
  echo "  WARNING: DATABASE_URL still has placeholder values."
  echo "  Edit .env.local and replace with your Supabase connection string,"
  echo "  then run: npx prisma db push"
else
  npx prisma db push --skip-generate
  echo "  OK: Database schema pushed"
fi

# ── 5. Done ────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║          Setup complete!                     ║"
echo "║                                              ║"
echo "║  Run the dev server:                         ║"
echo "║    npm run dev                               ║"
echo "║                                              ║"
echo "║  Then open:                                  ║"
echo "║    http://localhost:3000                      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
