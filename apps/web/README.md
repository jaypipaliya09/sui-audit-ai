# SuiAudit AI — Web

Next.js 14 frontend for the SuiAudit AI platform. Provides the audit dashboard, real-time analysis UI, GitHub repo scanner, admin portal, and on-chain report viewer.

## Tech Stack

- **Framework** — Next.js 14 (App Router)
- **Styling** — Tailwind CSS
- **Animation** — Framer Motion
- **Charts** — Recharts
- **Blockchain** — `@mysten/sui`, `@mysten/dapp-kit`
- **Editor** — Monaco Editor (contract code input)
- **HTTP** — Axios, TanStack Query
- **Markdown** — react-markdown + remark-gfm
- **Auth** — JWT stored in cookies via `js-cookie`

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/admin/login` | Admin / user login |
| `/dashboard` | User audit dashboard |
| `/audit` | Submit Move contract for analysis |
| `/report/:id` | View audit report |
| `/my-audits` | Audit history |
| `/repo-audit` | GitHub repository scanner |
| `/repo-report/:owner/:repo` | Repo audit report with badge |
| `/how-it-works` | Platform explainer |
| `/cli` | CLI tool documentation |
| `/verify` | On-chain audit verification |
| `/admin/dashboard` | Admin panel |

## Setup

### 1. Install dependencies

```bash
cd apps/web
npm install
```

### 2. Configure environment

Create `.env.local` in `apps/web/`:

```env
# Backend API URL (must be publicly accessible for badge embeds to work on GitHub)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Optional: demo wallet address shown on landing page
NEXT_PUBLIC_DEMO_WALLET_ADDRESS=0x...
```

> **Note:** Badge embeds in GitHub README files require `NEXT_PUBLIC_API_URL` to point to a publicly deployed API. `localhost` URLs will fail silently on GitHub.

### 3. Start the dev server

```bash
npm run dev
```

App runs at `http://localhost:3000`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Lint with ESLint |

## Key Components

| Component | Location | Description |
|-----------|----------|-------------|
| `LogoMark` | `src/components/LogoMark.tsx` | SVG brand mark |
| `Navbar` | `src/components/Navbar.tsx` | Top navigation |
| `Footer` | `src/components/Footer.tsx` | Site footer |
| Auth layout | `src/app/(auth)/layout.tsx` | Split-panel login shell |
| Dashboard layout | `src/app/(dashboard)/layout.tsx` | Sidebar dashboard shell |
| Admin layout | `src/app/admin/dashboard/layout.tsx` | Admin panel shell |

## Auth Flow

1. User logs in at `/admin/login`
2. JWT returned from API, stored in `localStorage` and cookies
3. `src/lib/auth.tsx` context exposes `login`, `logout`, `user`
4. Dashboard routes protected by `(dashboard)/layout.tsx` guard

## Badge Embed

Every GitHub repo audit generates an SVG badge served by the API:

```
GET /repo-audit/badge/:owner/:repo
```

Embed in any README:

```markdown
![Audit Badge](https://your-api.com/repo-audit/badge/owner/repo)
```

The badge dynamically reflects the latest audit risk level and finding count.
