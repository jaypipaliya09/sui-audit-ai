# @sui-audit/move-auditor

Audit Sui Move smart contracts with the **Claude CLI**, generate Markdown reports with **Groq**, and pay **per file (1 USDC)** from your **Slush wallet** — using an on-chain **escrow** that blocks funds on start, deposits on success, and refunds on failure or `Ctrl+C`.

## Install

```bash
npm install -g @sui-audit/move-auditor
```

Requires the [Claude CLI](https://docs.claude.com/claude-code) on your `PATH` and a Groq API key.

## Quick start

```bash
move-auditor          # interactive: wallet -> choose files -> pay -> audit
```

The wizard:

1. Asks for your **Slush wallet address** and validates it (Slush API + Sui RPC balance).
2. Asks whether to audit a **single .move file** or the **full codebase**.
3. Scans, counts `.move` files, and shows the cost (**1 USDC per file**).
4. On **yes**, **blocks** the total in an on-chain escrow.
5. Audits each file (Claude) and writes a Markdown report (Groq) to `./move-auditor-reports/`.
6. On success → **deposits** the payment. On error or `Ctrl+C` → **releases** it (you are not charged).

Power-user mode (no payment, single file):

```bash
move-auditor scan path/to/contract.move -o report.md
```

## Configuration

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
| --- | --- |
| `GROQ_API_KEY` | Report generation |
| `SUI_NETWORK` | `testnet` (default) / `mainnet` |
| `ESCROW_PACKAGE_ID` | Published `move_auditor` package id |
| `TREASURY_ADDRESS` | Receives captured (deposited) payments |
| `USDC_COIN_TYPE` | Payment coin type (defaults to Circle testnet USDC) |
| `MOVE_AUDITOR_SECRET_KEY` | Payer key — signs the escrow lock + refund (`suiprivkey1...` or base64) |
| `TREASURY_SECRET_KEY` | Treasury key — signs `capture` on success (operator/testnet) |
| `SLUSH_API_URL` / `SLUSH_API_KEY` | Slush API for wallet validation (optional) |
| `BACKEND_URL` | Upload finished runs to the per-user dashboard |
| `MOVE_AUDITOR_MOCK_PAYMENT=1` | Dry-run the flow with no real funds |

## Deploy the escrow contract

```bash
cd ../contracts
sui move build
sui client publish --gas-budget 100000000
# copy the published package id into ESCROW_PACKAGE_ID
```

The escrow module (`apps/contracts/sources/audit_escrow.move`) exposes:

- `lock(payment, authority)` — payer blocks funds into a shared `AuditEscrow`.
- `capture(escrow)` — **authority** sweeps funds to the treasury (success).
- `refund(escrow)` — **payer or authority** returns funds (failure / Ctrl+C).

## Trust model & limitations (testnet build)

- A wallet API cannot silently move SUI — the payer signs the `lock`. The CLI uses `MOVE_AUDITOR_SECRET_KEY` to sign locally.
- `refund` is **payer-callable** so rollback works offline (instant on `Ctrl+C`). The trade-off: before `capture`, a payer could refund themselves. For production, harden with authority-only finalization (capture + refund via a backend signer or a time-lock) so a successful audit is always paid.
- `capture` needs the treasury signer: set `TREASURY_SECRET_KEY` (operator/testnet) or route capture through the backend.
- Crash recovery: an interrupted run leaves a `pendingHold` in `~/.move-auditor/config.json`; the next launch offers to release it.
