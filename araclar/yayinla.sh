#!/usr/bin/env bash
# Yayın: site/ (statik dosyalar) + functions/ (sunucu kodu) → Cloudflare Pages projesi "idealistgyo".
# Gerekli ortam değişkenleri: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
#   (bulut oturumunda ortam ayarlarından ya da yerelde gitignore'daki .env dosyasından; ASLA depoya yazılmaz).
# Gizli anahtarlar RESEND_API_KEY ve KOD_TUZU Pages proje ayarlarında durur; bu betik onlara dokunmaz.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; . ./.env; set +a; fi
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN tanımlı değil}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID tanımlı değil}"
[ -d node_modules ] || npm install --no-audit --no-fund
python3 araclar/panel-sayfasi/olustur.py
npx tsc --noEmit -p .
if find site -type f -size +25M | grep -q .; then
  echo "HATA: site/ içinde 25 MB üstü dosya var (Pages sınırı). Bu dosyalar R2'ye (idealist-belgeler) konmalı:"; find site -type f -size +25M; exit 1
fi
npx wrangler pages deploy site --project-name idealistgyo --branch main --commit-dirty=true
echo "Yayın tamam. Doğrulama: python3 araclar/dogrula.py"
