# Migrate off Render free / run FREE Payment Gateways for $0

> **Why this doc exists:** Render suspended `free-mfs-bd` ("Free usage limit reached").
> Root cause: the keep-alive GitHub Action (`.github/workflows/keep-alive.yml`)
> pings `/health` every 5 minutes so the free service never sleeps — that burns the
> **750 free instance hours per workspace per calendar month** (or the free bandwidth
> quota if you have no payment method on file). Render then suspends ALL free services
> until the next billing period (Dec 1).
>
> Fix the cause either way: **Actions → "Keep Render awake" → "⋯" → Disable workflow**.
> Then pick one option below.

---

## Option A — Oracle Cloud "Always Free" VPS ⭐ recommended for this gateway

Truly free forever (4 ARM cores / 24 GB RAM ceiling), always-on (no cold starts,
no monthly hour quota), your own IP + any domain, HTTPS free.
You need: an Oracle Cloud account (a card is used for **verification only** — Always Free
resources are never billed) and a domain (optional — can also test by raw IP first).

### A1. Create the VM
1. Sign up at <https://www.oracle.com/cloud/free/>.
2. Console → **Compute → Instances → Create instance**.
3. Name: `free-mfs-bd`. Image: **Canonical Ubuntu 24.04**. Shape: **VM.Standard.A1.Flex**
   (Ampere) — set **2 OCPU / 12 GB** (well inside the Always Free 4/24 budget; if A1 is
   "out of capacity", retry later or use a different availability domain — it's free, it's popular).
4. Networking: default VCN is fine. **Add SSH public key** (paste `~/.ssh/id_ed25519.pub`
   or let it generate one — download it!).
5. Create. Note the **Public IP**.

### A2. Open ports 80 + 443 (Oracle blocks them by default — TWO layers)
1. Console → Networking → VCN → **Security Lists → Default Security List → Add Ingress Rules**:
   - `0.0.0.0/0` TCP **80**, `0.0.0.0/0` TCP **443**   (keep 22 for SSH)
2. The VM's iptables also rejects them — the deploy script (A3) fixes that automatically.

### A3. Deploy
```bash
scp scripts/deploy-oracle-free.sh ubuntu@<PUBLIC_IP>:~
ssh ubuntu@<PUBLIC_IP>
sudo -E BASE_URL=http://<PUBLIC_IP> ./deploy-oracle-free.sh
```
The script: updates Ubuntu → installs Docker → opens 80/443 (iptables + persists) →
clones this repo → writes `.env` (auto-generates `ADMIN_PASSWORD`, **shown once** — save it) →
`docker compose up -d --build`. ~5 minutes.

Optional flags: `DATABASE_URL=...` (persistent Postgres, see A6) and
`ADMIN_PASSWORD=...`. Without DATABASE_URL the app uses embedded SQLite in
`~/free-payment-gateways/data` (already in a Docker volume).

### A4. HTTPS (free) — pick ONE

**Caddy (simplest if your domain points at the VM):** point an A record `pay.yourdomain.com → <PUBLIC_IP>`, then:
```bash
cat > ~/Caddyfile <<'EOF'
pay.yourdomain.com {
    reverse_proxy localhost:3000
}
EOF
docker run -d --name caddy --restart unless-stopped \
  -p 80:80 -p 443:443 \
  -v ~/Caddyfile:/etc/caddy/Caddyfile:ro \
  -v caddy-data:/data -v caddy-config:/config \
  caddy:2
```
Caddy auto-issues a Let's Encrypt cert. Then set `BASE_URL=https://pay.yourdomain.com` in
`~/free-payment-gateways/.env` and run `docker compose up -d --force-recreate`.

**Cloudflare Tunnel (if you don't want open ports / no public IP port-forward):**
domain on Cloudflare → Zero Trust → Networks → Tunnels → create → copy the token, then:
```bash
docker run -d --name cloudflared --restart unless-stopped \
  cloudflare/cloudflared:latest tunnel --no-autoupdate run --token <TOKEN>
```
In the tunnel dashboard add public hostname `pay.yourdomain.com` → `http://localhost:3000`.
Works even behind NAT and needs no 80/443 ingress rule.

### A5. Verify
```bash
curl https://pay.yourdomain.com/health   # expect 2xx
```
`/admin` with the ADMIN_PASSWORD → create an API key → test checkout. Done.

### A6. Persistent data (recommended)
The app ships with SQLite; on any redeploy SQLite lives in the compose volume (kept), but for
bullet-proof persistence use free Postgres:
1. Create a project at <https://neon.tech> (free 0.5 GB) or Supabase / CockroachDB Serverless.
2. Put the connection string in `.env` as
   `DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require`
3. `docker compose up -d --force-recreate` — schema auto-creates on boot.

> ⚠️ Data does **not** migrate automatically from SQLite → Postgres. Existing invoices /
> API keys / settings stay in the old SQLite file. For a fresh setup this is fine; to keep
> old rows, dump and import manually, or keep SQLite (default) — with the Docker volume in
> `docker-compose.yml` it survives restarts and rebuilds anyway.

---

## Option B — Google Cloud Run (easiest, scale-to-zero)

Serverless containers, free tier ≈ **2 million requests/month**, scales to zero.
Trade-off vs Option A: a few seconds cold start per request after idle.

```bash
# needs: gcloud CLI + billing enabled on the project (free tier still applies)
gcloud run deploy free-mfs-bd \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --min-instances=0 \
  --set-env-vars "BASE_URL=https://free-mfs-bd-xxxxx.a.run.app,TRUST_PROXY=true,ADMIN_PASSWORD=<long-random>,DATABASE_URL=postgresql://...neon.tech/db?sslmode=require"
```
(The repo's `Dockerfile` is used automatically. Set `DATABASE_URL` — Cloud Run's filesystem
is ephemeral.) Free custom domain: Console → Cloud Run → service → **Custom domains**.
Verify with `curl <url>/health`.

---

## Option C — Stay on Render free (zero migration, restore Dec 1)

1. **Disable the keep-alive workflow** (Actions → Disable). Essential — otherwise the quota
   burn repeats and you get suspended mid-month again.
2. Set `DATABASE_URL=<Neon free Postgres>` in the Render service's env vars
   (alternative: **Aiven Free Tier** — 1 GB RAM/storage, always free, no expiry: https://aiven.io/free-tier)
   (SQLite is wiped on every spin-down/restart).
3. Wait for the **Dec 1** monthly reset — free hours refill, service auto-resumes.
4. Accept ~1 min cold start on the first request after 15 min idle (Render shows a loader).

---

## After ANY migration — cleanup checklist

- [ ] **Disable** `.github/workflows/keep-alive.yml` (Render keeps $0/hr only when sleeping).
- [ ] Update **BASE_URL** everywhere: `.env` on the new host, WordPress plugin settings
      (Settings → FPG Gateway), webhook URLs in `/admin → Webhooks`.
- [ ] Update **WooCommerce/WordPress** checkout flow test order end-to-end.
- [ ] In the Render dashboard: delete or leave suspended the old `free-mfs-bd` service.
- [ ] `curl <new-url>/health` → 200; `/admin` login works; API key opens a test checkout.
- [ ] (Option A) `docker compose logs -f gateway` on the VPS to watch the first live traffic.

## Notes & gotchas

- **Oracle A1 "out of capacity"**: retry at a different time/availability domain — common, not permanent.
- **Oracle charges**: Always Free resources (A1 VM, VCN, 20 GB block volume) are never billed; a
  budget alert in Console → Billing is still a good idea.
- **Security**: keep the VPS patched (`unattended-upgrades` is installed by default on Ubuntu),
  don't expose `.env` (git-ignored), keep ADMIN_PASSWORD long, and use `DATABASE_URL`
  with `sslmode=require` for Neon.
- **Cost of doing nothing right**: the keep-alive ping also fails 330×/month harmlessly in
  GitHub Actions, but disable it anyway.
