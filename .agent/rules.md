# Vesotel Project - Context Rules

## 📋 Project Overview

**Project Name:** Vesotel  
**Type:** Multi-service Docker application  
**Purpose:** Work shift management system + Investor management application  
**Environment:** Development server (172.20.10.120) accessed via SSH from personal computer (172.20.10.157)

---

## ⚠️ CRITICAL: Docker Compose Syntax

> **IMPORTANTE:** Este proyecto usa **Docker Compose V2**
> 
> ❌ **NO FUNCIONA:** `docker-compose` (comando con guión - no existe en este sistema)  
> ✅ **USA SIEMPRE:** `docker compose` (compose como subcomando de docker)

**Ejemplos correctos:**
```bash
docker compose up -d           # ✅ Correcto
docker compose down            # ✅ Correcto
docker compose logs -f         # ✅ Correcto
docker compose restart backend # ✅ Correcto
```

**Ejemplos INCORRECTOS:**
```bash
docker-compose up -d           # ❌ Error: command not found
docker-compose down            # ❌ Error: command not found
```

**Todos los comandos en este proyecto, workflows y documentación usan la sintaxis `docker compose` (V2).**

---

## 🏗️ Architecture

### Docker Infrastructure

The project uses Docker Compose to orchestrate 5 services in a single network:

```
┌─────────────────────────────────────────────────────────────┐
│                    vesotel_network (bridge)                  │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │   PostgreSQL   │  │    Backend     │  │   Frontend   │  │
│  │  (port 5432)   │◄─┤   (port 8000)  │◄─┤ (port 3000)  │  │
│  │                │  │    FastAPI     │  │   Next.js    │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
│         ▲                                                    │
│         │            ┌────────────────┐  ┌──────────────┐  │
│         └────────────┤ Investor API   │◄─┤ Investor Web │  │
│                      │  (port 8001)   │  │ (port 3001)  │  │
│                      │    FastAPI     │  │   Next.js    │  │
│                      └────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐳 Docker Containers

### 1. **PostgreSQL** (`vesotel_postgres_container`)
- **Image:** `postgres:16-alpine`
- **Port:** `5432:5432` (exposed to host)
- **Volume:** `./01_PostgresData:/var/lib/postgresql/data`
- **Databases:**
  - `postgres` (main database for work shifts)
  - `InvestorDB` (investor application database)
- **Network:** `vesotel_network`
- **Restart Policy:** `unless-stopped`

**Access Command:**
```bash
docker exec -it vesotel_postgres_container psql -U postgres -d postgres
```

---

### 2. **Backend** (`vesotel_backend_container`)
- **Image:** Custom built from `./02_Backend`
- **Framework:** FastAPI (Python)
- **Port:** `8000:8000`
- **Volume:** `./02_Backend:/app` (hot reload enabled)
- **Environment Variables:**
  - `DATABASE_URL`: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`
  - `SECRET_KEY`: JWT authentication secret
  - `MAIL_*`: Email configuration (Gmail SMTP)
  - `SHOPIFY_*`: Shopify integration (optional)
- **Dependencies:** FastAPI, SQLAlchemy, Psycopg2, Pydantic, Passlib, Bcrypt, Python-JOSE
- **Network:** `vesotel_network`
- **API Docs:** http://localhost:8000/docs

**Main Features:**
- User authentication (JWT)
- Work log management
- Company management
- Email notifications
- Shopify webhook integration

---

### 3. **Frontend** (`vesotel_frontend_container`)
- **Image:** `node:20-alpine`
- **Framework:** Next.js 16 (React 19)
- **Port:** `3000:3000`
- **Volume:** `./03_Frontend:/app` (hot reload enabled)
- **Environment Variables:**
  - `NEXT_PUBLIC_API_URL`: Backend API URL
  - `NODE_ENV`: Development/Production
- **UI Library:** Radix UI + Tailwind CSS
- **State Management:** TanStack Query (React Query)
- **Network:** `vesotel_network`

**Key Dependencies:**
- Next.js 16.0.7
- React 19.2.0
- TanStack React Query
- Axios
- React Hook Form + Zod
- Recharts (analytics)
- React PDF Renderer
- Framer Motion (animations)

**Access:** http://localhost:3000

---

### 4. **Investor Backend** (`investor_backend_container`)
- **Image:** Custom built from `./06_InvestorApp/Backend`
- **Framework:** FastAPI (Python)
- **Port:** `8001:8000`
- **Volume:** `./06_InvestorApp/Backend:/app`
- **Database:** `InvestorDB` (PostgreSQL)
- **Command:** `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- **Network:** `vesotel_network`
- **API Docs:** http://localhost:8001/docs

---

### 5. **Investor Frontend** (`investor_frontend_container`)
- **Image:** `node:20-alpine`
- **Framework:** Next.js
- **Port:** `3001:3000`
- **Volume:** `./06_InvestorApp/frontend:/app`
- **Environment:** `NEXT_PUBLIC_API_URL=http://localhost:8001`
- **Network:** `vesotel_network`

**Access:** http://localhost:3001

---

## 🗄️ Database Schema (Main Application)

### Key Tables:

#### **users**
- `id` (UUID, PK)
- `email` (VARCHAR, UNIQUE)
- `hashed_password` (VARCHAR)
- `first_name`, `last_name` (VARCHAR)
- `role` (userrole: 'admin' | 'user')
- `is_active` (BOOLEAN)
- `is_active_worker` (BOOLEAN)
- `default_company_id` (UUID, FK → companies)
- `two_factor_code`, `two_factor_expires` (2FA)
- `must_change_password` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMP)

**Relations:**
- → `company_members` (user company assignments)
- → `work_logs` (user work shifts)
- → `user_company_rates` (custom pricing per company)
- → `notifications`
- → `user_devices`

#### **companies**
- Company information
- `settings` (JSON) - Company-specific feature flags and configurations

#### **work_logs**
- Work shift records
- Tutorial days, coordination hours, night shifts
- Gross/net pricing
- Client assignments

#### **clients**
- Client information for work logs

---

## 🔧 Technology Stack

### Backend (FastAPI)
```
FastAPI
├── SQLAlchemy (ORM)
├── Psycopg2 (PostgreSQL driver)
├── Pydantic (Validation)
├── Python-JOSE (JWT)
├── Passlib + Bcrypt (Password hashing)
├── FastAPI-Mail (Email)
└── Requests (HTTP client)
```

### Frontend (Next.js)
```
Next.js 16
├── React 19
├── TypeScript 5
├── Tailwind CSS 4
├── Radix UI (Components)
├── TanStack Query (Data fetching)
├── Axios (API client)
├── React Hook Form + Zod (Forms)
├── Recharts (Charts)
├── React PDF Renderer (Reports)
└── Framer Motion (Animations)
```

---

## 🌐 Network Configuration

**Network Name:** `vesotel_network`  
**Driver:** `bridge`  
**Internal DNS:**
- `postgres` → PostgreSQL container
- `backend` → Vesotel backend
- `frontend` → Vesotel frontend
- `investor_backend` → Investor backend
- `investor_frontend` → Investor frontend

**Port Mapping:**
- `localhost:3000` → Vesotel Frontend
- `localhost:8000` → Vesotel Backend API
- `localhost:3001` → Investor Frontend
- `localhost:8001` → Investor Backend API
- `localhost:5432` → PostgreSQL (exposed for debugging)

---

## 🔐 Environment Variables (.env)

### PostgreSQL
- `POSTGRES_USER=postgres`
- `POSTGRES_PASSWORD=<secure_password>`
- `POSTGRES_DB=postgres`

### Backend Authentication
- `SECRET_KEY=<64_char_hex>` (JWT secret)

### Email (Gmail SMTP)
- `MAIL_USERNAME=<email@gmail.com>`
- `MAIL_PASSWORD=<app_password>`
- `MAIL_FROM=<email@gmail.com>`
- `MAIL_FROM_NAME=<App Name>`
- `MAIL_PORT=587`
- `MAIL_SERVER=smtp.gmail.com`
- `MAIL_STARTTLS=True`
- `MAIL_SSL_TLS=False`
- `USE_CREDENTIALS=True`

### Shopify (Optional)
- `SHOPIFY_STORE_URL=<store_url>`
- `SHOPIFY_ACCESS_TOKEN=<token>`
- `SHOPIFY_WEBHOOK_SECRET=<secret>`

### Frontend
- `NEXT_PUBLIC_API_URL=http://localhost:8000`
- `NODE_ENV=development`

---

## 📁 Project Structure

```
/home/usuario/01_DockerData/
├── .env                          # Environment variables (gitignored)
├── .env.example                  # Template for environment variables
├── .gitignore                    # Git exclusions
├── docker-compose.yml            # Docker orchestration
├── README.md                     # Project documentation
├── backup_completo.sql           # Database backup
│
├── 01_PostgresData/              # PostgreSQL data volume (gitignored)
│
├── 02_Backend/                   # FastAPI backend
│   ├── main.py                   # Application entry point
│   ├── models.py                 # SQLAlchemy models
│   ├── crud.py                   # Database operations
│   ├── requirements.txt          # Python dependencies
│   └── ...
│
├── 03_Frontend/                  # Next.js frontend
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   ├── components/           # React components
│   │   └── lib/                  # Utilities and types
│   ├── public/                   # Static assets
│   ├── package.json              # Node dependencies
│   └── ...
│
├── 05_archivosCSV/               # CSV files storage
│
├── 06_InvestorApp/               # Investor application
│   ├── Backend/                  # FastAPI backend
│   └── frontend/                 # Next.js frontend
│
└── .agent/                       # Antigravity workflows and rules
    ├── workflows/
    │   ├── restart-services.md
    │   ├── backup-database.md
    │   ├── check-users.md
    │   ├── view-logs.md
    │   └── fresh-start.md
    └── rules.md                  # This file
```

---

## 🚀 Common Operations

### Docker Commands
```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f [service_name]

# Restart a service
docker compose restart [service_name]

# Rebuild and restart
docker compose up -d --build

# Execute command in container
docker exec -it <container_name> <command>
```

### Database Operations
```bash
# Connect to PostgreSQL
docker exec -it vesotel_postgres_container psql -U postgres -d postgres

# List users
docker exec vesotel_postgres_container psql -U postgres -d postgres -c "SELECT * FROM users;"

# Create backup
docker exec vesotel_postgres_container pg_dump -U postgres postgres > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup.sql | docker exec -i vesotel_postgres_container psql -U postgres -d postgres
```

### Development Workflow
```bash
# Frontend: Install dependencies
docker compose exec frontend npm install

# Frontend: Clear Next.js cache
docker compose exec frontend rm -rf .next

# Backend: Run Python script
docker exec -it vesotel_backend_container python script.py
```

---

## 🎯 User Roles and Features

### Admin
- Full system access
- Manage all users and companies
- View all work logs
- Configure company settings
- Access admin panel

### Supervisor
- View and manage users in assigned companies
- Edit and delete work logs
- Generate billing reports
- Access supervisor panel

### User (Worker)
- Create and edit own work logs
- View personal dashboard
- View own analytics and reports
- Calendar view

---

## ⚡ Important Notes

### When working with this project:

1. **Always use `docker compose`** (not `docker-compose`) - v2 syntax
2. **PostgreSQL connection** from backend uses internal DNS name `postgres`
3. **Environment variables** are loaded from `.env` file (never commit this)
4. **Hot reload** is enabled for both backend and frontend
5. **Port 5432** is exposed for database debugging (remove in production)
6. **Node modules** are mounted as volumes for faster Docker builds
7. **All services** restart automatically (`unless-stopped`)

### Security Considerations:
- Passwords are hashed with bcrypt
- JWT tokens for authentication
- 2FA support available
- Email verification support
- Database backups should be regular

### Development Server:
- **Server IP:** 172.20.10.120 (where containers run)
- **Personal Computer:** 172.20.10.157 (SSH client)
- **Connection:** SSH Remote via Antigravity IDE

---

## 🔄 Workflows Available

Use these slash commands for common operations:

- `/restart-services` - Restart all Docker containers
- `/backup-database` - Create PostgreSQL backup
- `/check-users` - Query users and their attributes
- `/view-logs` - View container logs
- `/fresh-start` - Complete environment reset

---

## 📝 Development Guidelines

When making changes to this project:

1. **Database migrations:** Ensure backward compatibility
2. **Environment variables:** Update both `.env` and `.env.example`
3. **Docker changes:** Test with `docker compose build --no-cache`
4. **Frontend changes:** Clear `.next` cache if issues occur
5. **Backend changes:** FastAPI auto-reloads with uvicorn
6. **Always backup database** before major changes

---

**Last Updated:** 2026-01-12
