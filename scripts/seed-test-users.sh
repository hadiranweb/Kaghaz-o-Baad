#!/usr/bin/env bash

# کدرمزها و ایمیل‌های تستی برای ۴ نقش رسمی پلتفرم «کاغذ و باد»
# این اسکریپت با فراخوانی تابع Edge Function حساب‌های تستی را در پایگاه داده ایجاد/بازنشانی می‌کند.

SUPABASE_URL=${SUPABASE_URL:-"https://invdjkxkyytdpervudzw.supabase.co"}
ANON_KEY=${SUPABASE_ANON_KEY:-""}

echo "=========================================================="
echo "  KaghazBaad — Test Accounts Seed (RBAC Matrix)"
echo "=========================================================="
echo ""
echo "4 Official Roles + Test Credentials:"
echo "----------------------------------------------------------"
echo " 1. [admin]       email: admin@kaghazbaad.test"
echo "                  pass:  TestAdmin@2026!"
echo " 2. [editor]      email: editor@kaghazbaad.test"
echo "                  pass:  TestEditor@2026!"
echo " 3. [contributor] email: contributor@kaghazbaad.test"
echo "                  pass:  TestContributor@2026!"
echo " 4. [user]        email: user@kaghazbaad.test"
echo "                  pass:  TestUser@2026!"
echo "----------------------------------------------------------"
echo ""

if [ -z "$ANON_KEY" ]; then
  echo "Tip: You can also trigger this seed directly from the Admin UI -> Users Manager -> 'Seed 4 Test Users' button."
else
  echo "Invoking create-test-users Edge Function..."
  curl -X POST "${SUPABASE_URL}/functions/v1/create-test-users" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H "Content-Type: application/json"
  echo ""
fi

echo "Done."
