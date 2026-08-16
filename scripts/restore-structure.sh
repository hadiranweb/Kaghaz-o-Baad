#!/usr/bin/env bash
# scripts/restore-structure.sh
# بازسازی ساختار استاندارد پروژه کاغذ و باد
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "[1/4] ساخت درخت دایرکتوری‌ها..."
mkdir -p src/components/ui src/components/admin src/contexts src/hooks src/integrations/supabase src/lib src/pages src/assets public supabase/functions/{admin-users,create-admin,livekit-token,livekit-webhook,rewrite-article,search-suggest,send-otp,verify-otp} supabase/migrations

echo "[2/4] انتقال فایل‌ها (در نسخه فعلی قبلا انجام شده)"
echo "[3/4] پاکسازی فایل‌های موقت..."
rm -f vite.config.ts.timestamp-*.mjs 2>/dev/null || true

echo "[4/4] اعتبارسنجی..."
test -f src/App.tsx && echo "✓ src/App.tsx"
test -f src/main.tsx && echo "✓ src/main.tsx"
test -f index.html && echo "✓ index.html"
test -f supabase/config.toml && echo "✓ supabase/config.toml"
echo "Restoration complete. Run 'npm run build' to verify."
