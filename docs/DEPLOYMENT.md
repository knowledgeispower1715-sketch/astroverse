# Deployment & Operations Guide — Astroverse Platform

## 1. Multi-Service Vercel Deployment

Astroverse is configured for native deployment on Vercel using the **Vercel Services** architecture (`vercel.json`). This enables the frontend Single Page Application, the Python FastAPI calculation engine, and the Node.js microservices to deploy as a unified project with shared routing and environment variables.

### 1.1 `vercel.json` Specification

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "app": {
      "root": ".",
      "buildCommand": "echo 'Static app ready'",
      "installCommand": "echo 'No install needed'",
      "outputDirectory": "."
    },
    "consultation-service": {
      "root": "services/consultation-service",
      "runtime": "node",
      "entrypoint": "server.ts",
      "bindings": [
        {
          "type": "service",
          "service": "wallet-service",
          "format": "url",
          "env": "WALLET_SERVICE_URL"
        }
      ]
    },
    "kundli-engine": {
      "root": "services/kundli-engine",
      "framework": "fastapi",
      "entrypoint": "main.py"
    },
    "wallet-service": {
      "root": "services/wallet-service",
      "framework": "express",
      "entrypoint": "src/server.ts"
    }
  },
  "rewrites": [
    {
      "source": "/api/wallet/(.*)",
      "destination": {
        "service": "wallet-service"
      }
    },
    {
      "source": "/api/auth/(.*)",
      "destination": {
        "service": "wallet-service"
      }
    },
    {
      "source": "/api/profiles(.*)",
      "destination": {
        "service": "wallet-service"
      }
    },
    {
      "source": "/api/pujas/(.*)",
      "destination": {
        "service": "wallet-service"
      }
    },
    {
      "source": "/api/(.*)",
      "destination": {
        "service": "kundli-engine"
      }
    },
    {
      "source": "/socket.io/(.*)",
      "destination": {
        "service": "consultation-service"
      }
    },
    {
      "source": "/(.*)",
      "destination": {
        "service": "app"
      }
    }
  ]
}
```

### 1.2 Routing & Internal Bindings
* **Top-Level Rewrites**:
  - `/api/auth/*`, `/api/wallet/*`, `/api/profiles*`, `/api/reports/*`, `/api/pujas/*`, `/api/user/*`, `/api/admin/*` $\to$ routed to `wallet-service`.
  - `/api/predictions/*`, `/api/kundli/*`, `/api/hora`, `/api/hourly-predictions`, `/api/geocode`, `/api/*` $\to$ routed to `kundli-engine`.
  - `/socket.io/*` $\to$ routed to `consultation-service`.
  - `/*` (Catch-all) $\to$ served by static frontend application (`app`).
* **Service Binding**:
  - `consultation-service` declares an internal binding to `wallet-service`.
  - Vercel automatically injects the internal URL of `wallet-service` into `process.env.WALLET_SERVICE_URL` at runtime.

### 1.3 Deploying to Vercel
```bash
# Authenticate with Vercel CLI
vercel login

# Test all services and bindings locally
vercel dev

# Deploy to Production
vercel --prod
```

---

## 2. Containerized Deployment (Docker Compose)

For dedicated servers, cloud VMs (AWS EC2, GCP Compute Engine, DigitalOcean), or local development, `docker-compose.yml` orchestrates all services and backing databases.

### 2.1 Starting the Services
```bash
# Build and start all containers in detached mode
docker compose up --build -d

# Check running container status
docker compose ps
```

### 2.2 Container Topology & Ports
| Container | Service | Port | Health Check |
| :--- | :--- | :--- | :--- |
| `astro_postgres` | PostgreSQL 16 DB | `5432:5432` | `pg_isready -U astro_admin -d astrotalk_db` |
| `astro_redis` | Redis 7 Session Store | `6379:6379` | `redis-cli ping` |
| `astro_kundli_engine` | FastAPI Calculation Engine | `8000:8000` | HTTP `GET /health` |
| `astro_wallet_service` | Express / Prisma Gateway | `5000:5000` | HTTP `GET /health` |
| `astro_consultation_service` | Socket.IO WebRTC Gateway | `4000:4000` | Socket connection ping |

### 2.3 Running Database Migrations
When starting for the first time, execute Prisma migrations inside the wallet service container:
```bash
docker compose exec wallet-service npx prisma migrate deploy
```

---

## 3. Production Readiness Checklist

1. [ ] **Environment Variables**: Populate all keys from `.env.example` in your production secret manager (Vercel Project Settings or Docker `.env`).
2. [ ] **Database Connection Pool**: Set `DATABASE_URL` with connection pooling enabled (e.g. Supabase, PgBouncer, or Neon pooled endpoint).
3. [ ] **Swiss Ephemeris Data**: In containerized setups, ensure `pyswisseph` has access to high-precision ephemeris data files if sub-arcsecond accuracy across 5000 BCE to 5000 CE is required.
4. [ ] **SSL / TLS Termination**: Ensure reverse proxy (Cloudflare, Nginx, or Vercel Edge) enforces HTTPS and WSS for all client traffic.
5. [ ] **CORS Security**: In production, replace `*` in Express and FastAPI CORS configurations with the production domain (`https://astroverse.app`).
