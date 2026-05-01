# Deployment Skill

Use this skill when the user asks to deploy, containerise, set up HTTPS, provision a VM, or update the production environment.

---

## Stack

- **Containers:** Docker Compose (frontend + backend + Caddy)
- **Frontend runtime:** nginx:alpine serving Vite build; proxies `/api/*` to `backend:3001`
- **Backend runtime:** Node 20 Alpine running `dist/index.js`
- **TLS:** Caddy with auto Let's Encrypt
- **Domain:** sslip.io (free, no purchase needed) — `<ip-with-hyphens>.sslip.io`
- **Cloud:** AWS EC2 `t3.medium` Ubuntu 22.04, `ap-southeast-1` (Singapore)
- **Static IP:** AWS Elastic IP associated to the instance

---

## Key Files

| File | Notes |
|---|---|
| `docker-compose.yml` | Three services: backend, frontend, caddy. Named volumes: `admin-data`, `caddy-data` |
| `Caddyfile` | One line: `<domain> { reverse_proxy frontend:80 }` — update domain when IP changes |
| `frontend/Dockerfile` | Multi-stage Vite build → nginx:alpine |
| `backend/Dockerfile` | Multi-stage tsc build → node:20-alpine; copies `src/data` → `dist/data` after build |
| `frontend/nginx.conf` | SPA fallback + `/api/` proxy |
| `backend/.env` | Contains `GEMINI_API_KEY`, `CORS_ORIGIN`, `PORT`, `NODE_ENV`, `GEMINI_MODEL` |

---

## Env Vars Checklist

```
GEMINI_API_KEY=        # required — covers STT, LLM, TTS
GEMINI_MODEL=gemini-2.0-flash
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://<sslip-domain>   # must match the live URL exactly
```

---

## Gotchas — Read Before Deploying

### Gemini API is blocked in Hong Kong
`ap-east-1` (HK) returns `[400] User location is not supported`. Always use `ap-southeast-1` (Singapore) or any US/EU region.

### crypto.randomUUID() requires HTTPS
The app uses `generateId()` in `src/utils/index.ts` which falls back to `Math.random` on plain HTTP. If you ever see `crypto.randomUUID is not a function`, it means the app is being accessed over HTTP — check Caddy logs and ensure port 443 is open in the EC2 security group.

### Admin data volume seeding
On first `docker compose up`, Docker seeds the empty `admin-data` volume from the image's `/app/dist/data`. This only happens once — subsequent deploys preserve the live data. To reset admin data to defaults: `docker volume rm ai-role-player_admin-data` then restart.

### env_file path
`docker-compose.yml` uses `env_file: ./backend/.env` — not the project root. The `.env` file must exist at `backend/.env` on the VM before running `docker compose up`.

### sslip.io domain format
Replace dots in the IP with hyphens: `13.214.175.59` → `13-214-175-59.sslip.io`. Update both `Caddyfile` and `CORS_ORIGIN` in `backend/.env` when the IP changes.

---

## Deploying to a New VM

```bash
# 1. On local machine — update Caddyfile with new IP
#    (edit Caddyfile, commit, push)

# 2. On the new VM
git clone https://github.com/sheetstone/ai-role-player.git
cd ai-role-player
cp backend/.env.example backend/.env
nano backend/.env          # fill in GEMINI_API_KEY + CORS_ORIGIN
docker compose up -d --build

# 3. Verify
docker compose ps          # all three services: Up
docker compose logs caddy  # should show: certificate obtained successfully
```

## Redeploying After Code Changes

```bash
git pull
docker compose up -d --build
```

## Useful Diagnostic Commands

```bash
docker compose ps                    # check all services are Up
docker compose logs -f               # tail all logs
docker compose logs caddy            # check TLS cert status
docker compose logs backend          # check API errors
curl http://localhost/api/health     # health check from inside VM
```
