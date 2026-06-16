# Testing Guide — Slush/USDC Audit Platform

## ✅ Live testnet deployment (already done & verified)

| Item | Value |
| --- | --- |
| Network | `testnet` |
| Escrow package id | `0x0e9241a243cc8e2ffee032aadf388a03f6cd4bd1d91cdbea7551cb8e5ed7da23` |
| Payer / Treasury address | `0x50e3e04cda64f8b09e7132e37018c4a16f7de442df6ca627c491f85a3a3178e5` |
| Verified on-chain | lock→capture (`242RZ1vo…`), lock→refund (`14LiJ7gy…`) — escrow objects deleted |

`apps/cli/.env` is already configured (`ESCROW_PACKAGE_ID`, `TREASURY_ADDRESS`, signing key, `SUI_NETWORK=testnet`).

### End-to-end run (current deployment)

```bash
# 0. confirm signer + gas
cd apps/cli
sui client active-address          # 0x50e3…78e5
sui client gas                     # needs some SUI for gas

# 1. Re-run the escrow smoke test (lock → capture → refund on-chain, uses SUI)
node smoke-escrow.js
#    → prints lock/capture/refund tx digests; verify on https://suiscan.xyz/testnet

# 2. Start the API (per-user report storage) — needs Postgres + Redis
cd ../api && npx prisma migrate deploy && npm run start:dev   # http://localhost:3001

# 3a. Real USDC pay-per-file audit  ← invokes the Claude Code CLI
#     First send testnet USDC to 0x50e3…78e5 via https://faucet.circle.com (Sui testnet)
cd ../cli
BACKEND_URL=http://localhost:3001 npm run start
#   wizard → wallet 0x50e3…78e5 → single file ../contracts/sources/audit_escrow.move → yes
#   blocks USDC (lock) → 'Auditing with Claude...' → 'Groq report' → deposits USDC (capture)

# 3b. No USDC yet? Prove the same flow with a mock payment:
MOVE_AUDITOR_MOCK_PAYMENT=1 BACKEND_URL=http://localhost:3001 npm run start

# 4. Verify reports
ls move-auditor-reports/                                       # *.audit.md, SUMMARY.md
curl "http://localhost:3001/audit-runs?wallet=0x50e3e04cda64f8b09e7132e37018c4a16f7de442df6ca627c491f85a3a3178e5" | jq

# 5. Rollback check: re-run step 3 and press Ctrl+C mid-audit → 'Funds released'

# 6. Web dashboard
cd ../web && npm run dev                                       # http://localhost:3000
#   connect wallet 0x50e3…78e5 → /my-audits → 'Move Auditor CLI Runs' → open a file

# 7. (optional) Buy a plan with USDC: /pricing → connect Slush → Get Started (Developer 10 USDC)
```

---



End-to-end test steps for: the **move-auditor CLI** (pay-per-file escrow), the **escrow Move contract**, the **API** (audit-runs + Slush/USDC plans), and the **web** (plan purchase + per-user report UI).

There are two tracks:
- **Track A — Mock (no funds, no faucet):** validate the entire CLI flow + reports + dashboard upload without spending anything. Start here.
- **Track B — Real testnet:** deploy the escrow contract and move real testnet SUI/USDC.

---

## 0. One-time setup

```bash
# from repo root
npm install

# API: env + DB
cd apps/api
cp .env.example .env 2>/dev/null || true   # ensure DATABASE_URL, SUI_NETWORK=testnet, TREASURY_ADDRESS
npx prisma generate
npx prisma migrate deploy                   # applies all migrations incl. slush_usdc_and_audit_runs

# CLI: env
cd ../cli
cp .env.example .env                        # set GROQ_API_KEY at minimum
npm run build
```

Make sure the **Claude CLI** is installed and on your PATH (`claude --version`) — the auditor shells out to it.

---

## Track A — Mock flow (no funds required)

This proves wallet validation → scan → cost → block → audit → per-file reports → deposit → dashboard upload, with a fake payment.

### A1. Start the API (so the CLI can upload runs)
```bash
cd apps/api
npm run start:dev          # needs Postgres + Redis running
# API listens on http://localhost:3001
```

### A2. Run the CLI in mock-payment mode
```bash
cd apps/cli
MOVE_AUDITOR_MOCK_PAYMENT=1 BACKEND_URL=http://localhost:3001 npm run start
```
Then in the wizard:
1. **Wallet address:** paste any valid Sui address (`0x` + 64 hex). It’s validated for format + balance via RPC.
2. **Scope:** choose *single file* → point it at `../contracts/sources/audit_escrow.move` (or *full codebase* → `../contracts`).
3. Confirm the cost (1 USDC/file). Answer **yes**.
4. Watch: `[mock] blocked … USDC`, per-file `Auditing with Claude` → `Generating report with Groq`, then `[mock] captured …`.

**Expected results:**
- Reports written to `apps/cli/move-auditor-reports/*.audit.md` (+ `.json` + `SUMMARY.md`).
- Console prints `✓ Reports uploaded to your dashboard.`

### A3. Test the rollback (Ctrl+C refund)
Re-run A2 and press **Ctrl+C** during the audit phase. You should see:
```
Interrupted (Ctrl+C) — releasing blocked funds...
✓ Funds released. You were not charged.
```

### A4. Verify the backend stored the run
```bash
# list runs for the wallet you used
curl "http://localhost:3001/audit-runs?wallet=<THE_ADDRESS_YOU_USED>" | jq
# fetch one run with full markdown
curl "http://localhost:3001/audit-runs/<RUN_ID>" | jq '.files[0].markdown' -r
```

### A5. See it in the web dashboard
```bash
cd apps/web && npm run dev      # http://localhost:3000
```
- Connect the **same wallet address** (Navbar → connect).
- Go to **/my-audits** → scroll to **“Move Auditor CLI Runs”** → click a file → the Markdown report opens in a modal.

---

## Track B — Real testnet (deploy + escrow)

### B1. Fund the active address
```bash
sui client active-address
# Fund via the web faucet (CLI faucet is rate-limited):
#   https://faucet.sui.io/?address=<ADDRESS>
sui client gas        # confirm you have gas coins
```

### B2. Deploy the escrow contract
```bash
cd apps/contracts
sui move build
sui client publish --gas-budget 100000000
# Copy the published Package ID from the output, then set it in the CLI env:
cd ../cli
#   ESCROW_PACKAGE_ID=<published package id>
#   TREASURY_ADDRESS=<your address>     (receives captured funds)
#   MOVE_AUDITOR_SECRET_KEY=<suiprivkey…> (sign lock/refund)
#   TREASURY_SECRET_KEY=<suiprivkey…>   (sign capture; same key for solo test)
```

### B3. Smoke-test the escrow (uses SUI — no USDC needed)
The contract is generic over `Coin<T>`, so this validates lock/capture/refund with SUI:
```bash
cd apps/cli
npm run build
node smoke-escrow.js
```
**Expected:** two `lock` digests, one `capture` digest, one `refund` digest, ending with
`✓ Escrow smoke test passed: lock, capture, and refund all work.`
Verify each digest on https://suiscan.xyz/testnet (search the digest).

### B4. Real USDC pay-per-file audit
You need **testnet USDC** in the wallet (Circle testnet faucet / a DEX). Then:
```bash
cd apps/cli
BACKEND_URL=http://localhost:3001 npm run start
# wizard: wallet → file/codebase → yes
```
Watch for: `✓ Blocked N USDC (escrow 0x…)` → audits → `✓ Deposited N USDC.`
- On success: USDC moved to `TREASURY_ADDRESS`; reports uploaded.
- On Ctrl+C/error: USDC returned to your wallet (escrow `refund`).

---

## Track C — API: Slush/USDC plan purchase

`POST /billing/purchase` activates a plan after verifying an on-chain USDC transfer to the treasury.

### C1. From the web (recommended)
```bash
cd apps/web && npm run dev
```
- Set web env: `NEXT_PUBLIC_API_URL=http://localhost:3001`, `NEXT_PUBLIC_TREASURY_ADDRESS=<treasury>`, `NEXT_PUBLIC_USDC_COIN_TYPE=<usdc type>`.
- Log in, connect the **Slush** wallet, go to **/pricing**, click **Get Started** on Developer (10 USDC).
- Slush prompts to sign a USDC transfer → on success the page calls `/billing/purchase` with the `txDigest`.
- **Expected:** “DEVELOPER plan activated — paid 10 USDC.” then redirect to /my-audits.
- Check **/dashboard/billing** shows the new plan + limit (25).

### C2. Verify the API rejects bad payments
- Reusing the same `txDigest` twice → `400 This payment has already been redeemed`.
- A digest that didn’t pay the treasury → `400 Payment does not transfer N USDC to the treasury`.
- List plans: `curl http://localhost:3001/billing/plans | jq`.

---

## Quick checks (builds & types)

```bash
# CLI
cd apps/cli && npm run build

# API types
cd ../api && npx tsc -p tsconfig.build.json --noEmit

# Web types
cd ../web && npx tsc --noEmit

# Contract
cd ../contracts && sui move build

# DB migration status
cd ../api && npx prisma migrate status
```

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `claude exited with code …` | Install the Claude CLI; ensure it’s on PATH |
| `GROQ_API_KEY` empty | Set it in `apps/cli/.env` |
| `ESCROW_PACKAGE_ID is not set` | Publish the contract (B2) or use `MOVE_AUDITOR_MOCK_PAYMENT=1` |
| Faucet `Too Many Requests` | Use the web faucet UI; wait out the IP rate limit |
| `Payment transaction not found` (plan purchase) | Wait for the tx to finalize; confirm `SUI_NETWORK` matches |
| Escrow `coinWithBalance` can’t find coins | Wallet has no USDC of `USDC_COIN_TYPE` on that network |
| Reports not in dashboard | Set `BACKEND_URL` when running the CLI; connect the same wallet in web |
