# Deployment Log — 2026-04-30

## Goal

Ship AI Role Player as a publicly accessible HTTPS app using Docker Compose on a single cloud VM, accessible from China mainland with minimal latency.

---

## Architecture

```
Browser (HTTPS)
      │
      ▼
Caddy container  (ports 80/443 — auto Let's Encrypt via sslip.io)
      │
      ▼
frontend container  (nginx:alpine — React SPA + /api proxy)
      │
      ▼
backend container  (Node 20 — Express API)
      │
      ▼
Gemini API  (STT / LLM / TTS)
```

**Admin data persistence:** Docker named volume `admin-data` mounted over `backend/dist/data`. On first run Docker seeds the volume from the image (default JSON files baked in at build time). Changes survive container restarts and rebuilds.

---

## Files Added

| File | Purpose |
|---|---|
| `backend/Dockerfile` | Multi-stage: tsc build → slim runtime; seeds `dist/data` from `src/data` |
| `frontend/Dockerfile` | Multi-stage: Vite build → nginx:alpine |
| `frontend/nginx.conf` | SPA fallback + `/api/*` proxy to `backend:3001` |
| `docker-compose.yml` | Wires frontend, backend, caddy; named volumes for admin data + TLS state |
| `Caddyfile` | Caddy config — auto HTTPS for sslip.io domain |
| `.env.example` | Root-level template for VM operators |

---

## Issues Encountered

### 1. `env_file` path wrong in docker-compose
**Error:** `env file /home/ubuntu/ai-role-player/.env not found`
**Cause:** `env_file: .env` looked at project root; `.env` lives in `backend/`.
**Fix:** Changed to `env_file: ./backend/.env`.

### 2. `crypto.randomUUID()` crashes on plain HTTP
**Error:** `Uncaught TypeError: crypto.randomUUID is not a function`
**Cause:** Web Crypto API is restricted to secure contexts (HTTPS / localhost). The app was initially accessed over plain HTTP.
**Fix:** Added `generateId()` to `src/utils/index.ts` with a `Math.random`-based UUID v4 fallback. Replaced all four `crypto.randomUUID()` call sites.

### 3. Gemini API blocked from Hong Kong
**Error:** `[400 Bad Request] User location is not supported for the API use.`
**Cause:** Google Gemini API blocks requests from Hong Kong IP addresses. Initial EC2 was in `ap-east-1` (Hong Kong).
**Fix:** Moved EC2 to `ap-southeast-1` (Singapore) — Gemini API is supported, latency to China mainland is still ~40–60ms.

### 4. ALB + ACM requires a custom domain
**Decision:** Attempted AWS ALB + ACM for HTTPS. ACM cannot issue certs for bare IPs or ELB hostnames, and ALB setup introduced unnecessary complexity for an MVP.
**Fix:** Replaced with Caddy + sslip.io. sslip.io provides a free domain (`<ip-with-hyphens>.sslip.io`) that resolves to the VM IP, allowing Let's Encrypt to issue a real cert automatically. Zero domain purchase, ~5 min setup.

---

## Production Deployment Details

| Item | Value |
|---|---|
| Cloud | AWS EC2 |
| Region | `ap-southeast-1` (Singapore) |
| Instance | `t3.medium` — 2 vCPU / 4 GB RAM, Ubuntu 22.04 |
| Elastic IP | `13.214.175.59` (static) |
| Live URL | `https://13-214-175-59.sslip.io` |
| TLS | Caddy auto Let's Encrypt via sslip.io |

---

## Deployment Commands (on the VM)

First deploy:
```bash
git clone https://github.com/sheetstone/ai-role-player.git
cd ai-role-player
cp backend/.env.example backend/.env
# fill in GEMINI_API_KEY and CORS_ORIGIN
docker compose up -d --build
```

Redeploy after code changes:
```bash
git pull
docker compose up -d --build
```

Check status:
```bash
docker compose ps
docker compose logs -f
```
