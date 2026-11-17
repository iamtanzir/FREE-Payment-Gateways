#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# deploy-oracle-free.sh — one-shot FREE deploy of FREE-Payment-Gateways
# on an Oracle Cloud "Always Free" Ubuntu/Debian VPS (ARM Ampere A1 or AMD).
#
# Always Free ceiling: up to 4 OCPU + 24 GB RAM (ARM) — costs $0 forever.
#
# Usage:
#   scp scripts/deploy-oracle-free.sh ubuntu@<PUBLIC_IP>:~
#   ssh ubuntu@<PUBLIC_IP>
#   sudo -E BASE_URL=https://pay.yourdomain.com \
#        DATABASE_URL='postgresql://...neon.tech/db?sslmode=require' \
#        ADMIN_PASSWORD='long-random-secret' \
#        ./deploy-oracle-free.sh
#
# DATABASE_URL is OPTIONAL but recommended (persistent Postgres, e.g. Neon
# free tier). Without it the app uses embedded SQLite in ~/free-payment-gateways/data.
# ADMIN_PASSWORD is auto-generated (printed once) if omitted.
# ──────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/iamtanzir/FREE-Payment-Gateways.git}"
APP_DIR="${APP_DIR:-$HOME/free-payment-gateways}"
BASE_URL="${BASE_URL:-}"
DATABASE_URL="${DATABASE_URL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

[ "$(id -u)" -eq 0 ] || { echo "❌ Run as root:  sudo -E ./deploy-oracle-free.sh"; exit 1; }

echo "── [1/7] System update"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo "── [2/7] Install docker + git + iptables tools"
apt-get install -y git curl ca-certificates openssl iptables iptables-persistent docker.io
if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y docker-compose-v2 || { echo "── docker-compose-v2 not in repos, using get.docker.com"; curl -fsSL https://get.docker.com | sh; }
fi
systemctl enable --now docker

echo "── [3/7] Open ports 80 + 443 (Oracle Ubuntu images reject them by default!)"
# Insert accept rules BEFORE the final REJECT rule; idempotent.
for port in 80 443; do
  iptables -C INPUT -m state --state NEW -p tcp --dport "$port" -j ACCEPT 2>/dev/null || \
    iptables -I INPUT -m state --state NEW -p tcp --dport "$port" -j ACCEPT
done
netfilter-persistent save || iptables-save > /etc/iptables/rules.v4

echo "── [4/7] Firewall reminder"
echo "   ALSO open 80/tcp and 443/tcp in: Oracle Dashboard → VCN → Security Lists →"
echo "   Ingress Rules → Add: 0.0.0.0/0 TCP 80, 0.0.0.0/0 TCP 443 (and keep 22/tcp for SSH)."

echo "── [5/7] Clone / update repo"
sudo -u "${SUDO_USER:-ubuntu}" bash -c "
  if [ -d '$APP_DIR/.git' ]; then cd '$APP_DIR' && git pull --ff-only;
  else git clone --depth 1 '$REPO_URL' '$APP_DIR'; fi"

echo "── [6/7] Write .env"
if [ -z "$BASE_URL" ]; then
  PUBLIC_IP="$(curl -fsS --max-time 5 https://ifconfig.me || echo '<YOUR-PUBLIC-IP>')"
  BASE_URL="http://$PUBLIC_IP"
  echo "   BASE_URL not set — using $BASE_URL (change later in $APP_DIR/.env)"
fi
if [ -z "$ADMIN_PASSWORD" ]; then
  ADMIN_PASSWORD="$(openssl rand -hex 24)"
  echo "   ┌─────────────────────────────────────────────────────────┐"
  echo "   │ Generated ADMIN_PASSWORD (shown ONCE, save it now):     │"
  echo "   │ $ADMIN_PASSWORD"
  echo "   └─────────────────────────────────────────────────────────┘"
fi
sudo -u "${SUDO_USER:-ubuntu}" bash -c "cat > '$APP_DIR/.env'" <<EOF
PORT=3000
BASE_URL=$BASE_URL
TRUST_PROXY=true
ADMIN_PASSWORD=$ADMIN_PASSWORD
DATABASE_URL=$DATABASE_URL
DB_PATH=/app/data/fpg.db
EOF
chmod 600 "$APP_DIR/.env"

echo "── [7/7] Build & start (Docker)"
sudo -u "${SUDO_USER:-ubuntu}" bash -c "cd '$APP_DIR' && docker compose up -d --build && docker compose ps"

echo
echo "✅ Done. The gateway is on port 3000 of this VM."
echo "   Next steps:"
echo "   1. Point your domain's A record at this VM's public IP."
echo "   2. HTTPS (free): run Caddy — see docs/MIGRATE-FREE-HOST.md §HTTPS"
echo "      (or a Cloudflare Tunnel if you don't want open 80/443)."
echo "   3. Set BASE_URL in $APP_DIR/.env to https://your-domain, then:"
echo "      cd $APP_DIR && docker compose up -d --force-recreate"
echo "   4. Update the WordPress plugin + test: curl https://your-domain/health"
