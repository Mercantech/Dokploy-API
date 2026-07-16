# Dokploy User Admin (dokploy-user.mercantec.tech)

Simpel webdemo til at styre brugere på Dokploy via API (`x-api-key`).

## Services

| Service | Rolle |
|---------|--------|
| `api` | Hono-proxy til `https://deploy.mags.dk/api` (holder API-nøglen) |
| `web` | Vite-build bag Nginx + Traefik Host-routing |

## Env

Kopiér `.env.example` → `.env`:

```env
DOKPLOY_BASE_URL=https://deploy.mags.dk/api
DOKPLOY_API_KEY=din-nøgle
APP_DOMAIN=dokploy-user.mercantec.tech
```

`DokployKey` i `.env` understøttes også som fallback.

## Deploy (Dokploy / VPS)

Forudsætter eksternt netværk `dokploy-network` (Traefik).

```bash
docker compose -f ./docker-compose.yml up -d --build
```

Routing:

1. Cloudflare: `*.mercantec.tech` → tunnel  
2. Tunnel: `*.mercantec.tech` → `http://localhost:80`  
3. Traefik: `Host(\`dokploy-user.mercantec.tech\`)` → `web:8080`

## Lokal udvikling

Kræver Node 22+:

```bash
npm install
npm run dev
```

- UI: http://localhost:5173  
- API: http://localhost:8080  

## Funktioner (v1)

- Liste / opret / rediger / slet brugere  
- Sæt permissions (`canAccessToAPI`, Docker, projects, …)  
- List invitationer + invitér via `organization.inviteMember`
