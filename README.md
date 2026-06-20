# SuiAudit AI

AI-powered security auditing platform for Sui Move smart contracts. Delivers vulnerability reports in under 60 seconds, stores findings permanently on Walrus, and registers audits on-chain.

## Monorepo Structure

```
sui-audit-ai/
├── apps/
│   ├── api/          # NestJS backend — audit engine, REST API, WebSocket gateway
│   ├── web/          # Next.js 14 frontend — dashboard, audit UI, admin portal
│   └── cli/          # CLI tool for running audits from the terminal
├── packages/
│   └── shared-types/ # Shared TypeScript types across apps
└── contracts/        # Sui Move on-chain audit registry contracts
```

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 |
| npm | ≥ 10 |
| PostgreSQL | ≥ 15 |
| Redis | ≥ 7 |

## Quick Start

```bash
# Install all dependencies
npm install

# Run all apps in development mode
npm run dev
```

Individual apps run on:
- **API** → `http://localhost:3001`
- **Web** → `http://localhost:3000`

## Apps

| App | Description | README |
|-----|-------------|--------|
| `apps/api` | NestJS REST + WebSocket backend | [apps/api/README.md](apps/api/README.md) |
| `apps/web` | Next.js 14 dashboard | [apps/web/README.md](apps/web/README.md) |

## Tech Stack

- **AI** — Anthropic Claude Sonnet 4, Google Gemini, Groq
- **Blockchain** — Sui Move, Walrus decentralized storage
- **Backend** — NestJS, Prisma ORM, BullMQ, PostgreSQL, Redis
- **Frontend** — Next.js 14, Tailwind CSS, Framer Motion, Recharts
- **Auth** — JWT + Passport

## Scripts

| Command | Action |
|---------|--------|
| `npm run dev` | Start all apps in watch mode |
| `npm run build` | Build all apps |
| `npm run lint` | Lint all apps |

## License

MIT
