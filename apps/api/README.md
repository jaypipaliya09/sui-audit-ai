# SuiAudit AI — API

NestJS backend powering the SuiAudit AI platform. Handles contract analysis, AI-driven vulnerability detection, report generation, WebSocket progress streaming, Walrus decentralized storage, and on-chain audit registry interactions.

## Tech Stack

- **Framework** — NestJS 10, Express
- **Database** — PostgreSQL via Prisma ORM
- **Queue** — BullMQ + Redis
- **AI** — Anthropic Claude Sonnet 4, Google Gemini, Groq
- **Blockchain** — Sui Move (`@mysten/sui`)
- **Storage** — Walrus decentralized blob storage
- **Auth** — JWT + Passport (local + JWT strategies)
- **Email** — Nodemailer + React Email
- **Reports** — PDFKit + Puppeteer
- **Security** — Helmet, express-rate-limit, class-validator

## Modules

| Module | Description |
|--------|-------------|
| `auth` | Registration, login, JWT issuance and refresh |
| `users` | User CRUD and profile management |
| `audit` | Contract audit engine — AI analysis, BullMQ queue, WebSocket progress |
| `audit-runs` | Individual audit run history and diffs |
| `repo-audit` | GitHub repository scanning and SVG badge generation |
| `report` | PDF and HTML report generation |
| `walrus` | Walrus blob storage upload and retrieval |
| `on-chain` | Sui Move on-chain audit registry calls |
| `github` | GitHub API integration for repo metadata |
| `claude` | Anthropic Claude API service wrapper |
| `admin` | Admin dashboard — user management, metrics |
| `subscription` | Subscription tiers and limit enforcement |
| `rate-limiting` | Per-user rate limiting via BullMQ |
| `metrics` | Platform-level usage metrics |
| `email` | Transactional email delivery |
| `health` | Health check endpoint |

## Setup

### 1. Install dependencies

```bash
cd apps/api
npm install
```

### 2. Configure environment

Create a `.env` file in `apps/api/`:

```env
PORT=3001
NODE_ENV=development

# AI providers
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Walrus decentralized storage
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
WALRUS_EPOCHS=5

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/suiaudit

# Redis (required for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS — must match frontend origin
FRONTEND_URL=http://localhost:3000

# Audit limits
MAX_AUDITS_PER_HOUR=10
MAX_CONTRACT_SIZE_KB=500
```

### 3. Run database migrations

```bash
npx prisma migrate dev
```

### 4. Seed initial data

```bash
npm run seed:admin         # Create admin user
npm run seed:subscription  # Create subscription tiers
```

### 5. Start the server

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

Server starts at `http://localhost:3001`.

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | Login and receive JWT |
| `POST` | `/auth/register` | Create new account |
| `POST` | `/audit` | Submit Move contract for audit |
| `GET` | `/audit/:id` | Fetch audit result |
| `GET` | `/report/:id` | Download PDF report |
| `GET` | `/repo-audit/badge/:owner/:repo` | SVG status badge for GitHub repo |
| `GET` | `/health` | Health check |

WebSocket gateway at `ws://localhost:3001` streams real-time audit progress events.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Development server with auto-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:prod` | Run compiled production build |
| `npm run test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
| `npm run test:cov` | Test coverage report |
| `npm run lint` | Lint and auto-fix |
| `npm run seed:admin` | Seed admin user |
| `npm run seed:subscription` | Seed subscription plans |

## Database

Prisma schema is at `prisma/schema.prisma`.

```bash
npx prisma migrate dev    # Apply migrations and regenerate client
npx prisma studio         # Open visual database browser
npx prisma generate       # Regenerate Prisma client only
```
