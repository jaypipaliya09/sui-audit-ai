# Move Auditor — Paid CLI Package Plan

> Phase-wise implementation plan for the `move-auditor` npm package: install → connect Slush wallet → pay-per-file audit (1 SUI/file) with a **block → capture-on-success / refund-on-failure** escrow flow → per-file Markdown reports → per-user report UI.

---

## 0. Goal & High-Level Flow

A user installs our package globally (like any npm package), runs it, and goes through this flow:

```
install package (npm i -g @sui-audit/move-auditor)
        │
        ▼
run `move-auditor`
        │
        ▼
1. Ask for Slush wallet ID  ──► validate via Slush API (valid? balance?)
        │
        ▼
2. Ask: audit a single file OR the full codebase?
        │
        ├── single file  ──► cost = 1 SUI
        └── full codebase ──► scan repo, count .move files (N) ──► cost = N SUI
        │
        ▼
3. Show cost summary ──► "Proceed? (yes/no)"
        │  yes
        ▼
4. BLOCK / HOLD the SUI amount on-chain (escrow)   ◄── funds reserved, not yet spent
        │
        ▼
5. Run audit:  Claude CLI (audit)  ──►  Groq (report generation)
        │
        ├── SUCCESS  ──► CAPTURE the held amount (deposit to auditor)  +  write per-file .md reports
        ├── ERROR    ──► RELEASE / REFUND the held amount (rollback)
        └── Ctrl+C   ──► RELEASE / REFUND the held amount (rollback)
        │
        ▼
6. Per-user report visible in the UI (web app), grouped by wallet/user
```

### ⚠️ Key technical reality (read before Phase 4)
A wallet API cannot silently pull SUI from a user's Slush wallet. Funds on Sui move **only via transactions the owner signs**. So "block the amount, then deposit or release" must be implemented as a real **hold/capture/refund (escrow)** primitive. We have two viable models — pick one in Phase 0 (see Open Decisions):

- **Model A — On-chain escrow (trustless).** Extend `apps/contracts/sources/audit_registry.move` with an `escrow` object. User signs one tx to *lock* N SUI into an escrow object; backend/auditor signs `capture` on success or `refund` on failure. Strongest guarantees, more work.
- **Model B — Custodial ledger (centralized hold).** User pre-funds a custodial balance (one deposit tx). Our backend DB tracks `available` / `held` / `spent`. "Block" = move balance to `held`; "capture" = `held → spent`; "release" = `held → available`. Faster to ship, requires trusting our backend.

This plan is written so Phases 1–3, 5, 6 are identical for both models; only **Phase 4** differs.

---

## Phase 1 — Package scaffold & distribution

**Objective:** turn the current `apps/cli` into an installable, publishable package with a guided interactive flow (today it only has a one-shot `scan <path>` command).

- [ ] Rename/scope the package (`name` → e.g. `@sui-audit/move-auditor`), set `publishConfig`, `files`, `engines`, `repository`, `license`.
- [ ] Keep `bin: { "move-auditor": "./dist/index.js" }`. Add a default interactive entry (running bare `move-auditor` launches the wizard; keep `scan` as a power-user subcommand).
- [ ] Add interactive prompt lib (`@inquirer/prompts` or `prompts`) and a spinner (`ora`) — current code uses `commander` + `chalk` only.
- [ ] Add config persistence: store wallet address + session in `~/.move-auditor/config.json` so the user isn't re-asked every run.
- [ ] Build pipeline: `tsc` is already set; verify `dist/` shebang + `chmod +x`. Add `prepublishOnly: npm run build`.
- [ ] Dry-run publish (`npm pack`) and document the install command in README.

**Deliverable:** `npm i -g <pkg>` works; running `move-auditor` starts the wizard (even if steps are stubs).

---

## Phase 2 — Slush wallet connect & validation

**Objective:** ask for the Slush wallet ID and verify it.

- [ ] Prompt: "Enter your Slush wallet address".
- [ ] **Validate format** locally first: Sui address = `0x` + 64 hex chars (use `@mysten/sui/utils` `isValidSuiAddress`).
- [ ] **Validate via Slush API** (network confirmation): confirm the account exists / is reachable and read its SUI balance.
  - Need to confirm the exact Slush endpoint + auth — see Open Decisions. Fallback: query a Sui fullnode RPC (`suix_getBalance`) for the address via `@mysten/sui` `SuiClient`, which already proves the address is real and gives a balance.
- [ ] Show: resolved address + current SUI balance for confirmation.
- [ ] Persist the validated address to `~/.move-auditor/config.json`.
- [ ] Error states: invalid format, not found, RPC/Slush unreachable, zero balance.

**Deliverable:** a `WalletService` that returns `{ address, balanceSui, valid }`.

---

## Phase 3 — Audit target selection & cost calculation

**Objective:** let the user choose scope and compute the SUI cost (1 SUI/file).

- [ ] Prompt: "Single file" or "Full codebase".
- [ ] **Single file:** ask for path → validate it's a `.move` file and exists → `cost = 1 SUI`, `files = [path]`.
- [ ] **Full codebase:** ask for root dir (default `cwd`) → recursively scan for `*.move` (skip `build/`, `node_modules/`, `.git/`) → list discovered files → `count = N`, `cost = N SUI`.
- [ ] **Pre-flight check:** `cost <= walletBalance`? If not, stop with a clear message.
- [ ] **Cost summary screen:** number of files, list (truncated), total SUI, wallet balance after → `"Proceed? (yes/no)"`.
- [ ] Define the price constant centrally (`PRICE_PER_FILE_SUI = 1`) for easy change later.

**Deliverable:** an `AuditPlan { files: string[], totalCostSui: number }` confirmed by the user.

---

## Phase 4 — Wallet HOLD → CAPTURE / RELEASE (escrow / rollback)  ⭐ core

**Objective:** implement the block-on-confirm, deposit-on-success, refund-on-failure behavior with safe rollback. **Choose Model A or B (Open Decisions).**

### Shared interface (model-agnostic)
```ts
interface PaymentService {
  hold(address: string, amountSui: number): Promise<HoldId>;   // block funds
  capture(hold: HoldId): Promise<TxResult>;                    // deposit on success
  release(hold: HoldId): Promise<TxResult>;                    // refund on failure/Ctrl+C
}
```

### Model A — On-chain escrow (extend `audit_registry.move`)
- [ ] Add Move struct e.g. `AuditEscrow { id, payer, amount: Coin<SUI>, status }` + entry fns `lock`, `capture`, `refund`.
- [ ] CLI builds a `lock` programmable tx → user **signs** (wallet/CLI signing flow — see Open Decisions on how the CLI gets a signature) → escrow object created on-chain = "blocked".
- [ ] On success: backend/auditor key signs `capture` (funds → treasury). On failure: signs `refund` (funds → payer).
- [ ] Persist `escrowObjectId` as the `HoldId` for rollback.

### Model B — Custodial ledger
- [ ] One-time: user deposits SUI to our custodial address (signed deposit tx); backend credits `available`.
- [ ] `hold`: DB transaction `available -= cost; held += cost` → returns `holdId`.
- [ ] `capture`: `held -= cost; spent += cost`.
- [ ] `release`: `held -= cost; available += cost`.
- [ ] Idempotency keys so a retried capture/release can't double-apply.

### Rollback / signal handling (both models) — **critical**
- [ ] Register `SIGINT` (Ctrl+C), `SIGTERM`, and `uncaughtException`/`unhandledRejection` handlers.
- [ ] Maintain an in-process "active hold" reference; on any interrupt/error → call `release(hold)` **before** exiting, print "Funds released, you were not charged."
- [ ] Make `release` and `capture` **idempotent** and retry-safe (network failure during refund must not leave funds stuck).
- [ ] Crash recovery: persist active-hold state to disk; on next launch, detect an orphaned hold and offer to release it.
- [ ] Never capture unless **all** requested files completed (define partial-success policy — see Open Decisions).

**Deliverable:** funds are reserved on "yes", returned on Ctrl+C/error, and only deposited after a clean finish.

---

## Phase 5 — Audit execution & per-file report generation

**Objective:** run the existing audit pipeline per file and emit one `.md` per `.move` file. (Reuses current `ClaudeCliService` + `GroqReportService`.)

- [ ] Iterate over `AuditPlan.files`. For each file:
  - [ ] **Audit** with Claude CLI (`ClaudeCliService.auditContract`) → `AuditResult` JSON.
  - [ ] **Report** with Groq (`GroqReportService.generateMarkdownReport`) → Markdown.
  - [ ] Write `report/<fileName>.audit.md` (and keep raw JSON alongside).
  - [ ] Progress UI: `ora` spinner per file, running tally `(i/N)`, per-file risk badge.
- [ ] Robustness: wrap each file in try/catch; decide per-file failure policy (skip+continue vs abort+refund — Open Decisions). Add a concurrency limit if parallelizing Claude calls.
- [ ] Harden current code: the Claude prompt is shell-interpolated (`claude -p '...'`) — switch to `spawn` with argv to avoid shell-escaping/injection issues on large files.
- [ ] After all files: build a **run summary** (counts by severity, per-file links, total cost) → only now trigger Phase 4 `capture`.
- [ ] Upload reports + summary to the backend (`apps/api`) tied to the wallet address (so the UI can show them).

**Deliverable:** `report/*.audit.md` files locally + uploaded run record; on success → `capture`, on failure → `release`.

---

## Phase 6 — Per-user report UI

**Objective:** show each user their audit history/reports in the web app, scoped to their wallet.

- [ ] **Backend (`apps/api`):** endpoints to store an audit run (wallet, files, findings, report markdown, cost, tx/escrow id, status) and to list/fetch runs by wallet. (There are existing `report`, `audit`, `users`, `on-chain` modules to extend rather than build fresh.)
- [ ] Associate runs with the **wallet address** as the user identity (reuse `sui-auth.service.ts` for wallet-based auth/ownership proof so users only see their own reports).
- [ ] **Web (`apps/web`):** "My Audits" page — list of runs (date, scope, # files, risk summary, cost, status) → drill into a run → rendered per-file Markdown report.
- [ ] Link CLI → UI: after a run, print the URL where the user can view the report.

**Deliverable:** logged-in (wallet-verified) user sees their own audit reports in the UI.

---

## Cross-cutting concerns
- [ ] **Security:** never log private keys/signatures; secrets via env; validate all file paths (no traversal); rate-limit backend.
- [ ] **Config/secrets:** `GROQ_API_KEY` (already used), Sui RPC URL, Slush API base/key, custodial/treasury address, backend URL.
- [ ] **Testing:** unit tests for cost calc, hold/capture/release, SIGINT rollback; integration test on Sui **testnet** before mainnet.
- [ ] **Idempotency & audit log:** every hold/capture/release recorded with a unique id for reconciliation.
- [ ] **Pricing config:** `PRICE_PER_FILE_SUI` configurable; consider testnet vs mainnet defaults.

---

## Open Decisions (need your input before building)
1. **Escrow model:** Model A (on-chain escrow, trustless) or Model B (custodial ledger, faster)? — drives Phase 4.
2. **Slush API:** Do you have the actual Slush API base URL + auth/docs? Or should we validate wallets via Sui fullnode RPC (`suix_getBalance`) instead?
3. **CLI signing:** How does the CLI obtain the user's signature to lock funds — deep-link to Slush, paste a signed tx, a local keystore, or a sponsored/backend-signed tx? (Critical for Model A.)
4. **Partial failure policy:** if 3 of 10 files fail, do we capture for the 7 successes, refund everything, or refund only the failed 3?
5. **Network:** ship on **testnet** first, then mainnet?
6. **Price:** confirm fixed `1 SUI` per file (single file and per-file in full-codebase scans).

---

## Suggested build order
`Phase 1 (scaffold) → Phase 2 (wallet validate) → Phase 3 (scope+cost) → Phase 4 (hold/capture/release) → Phase 5 (audit+reports) → Phase 6 (UI)`

Phases 1–3 + 5 can be built/tested with a **mock PaymentService** so the audit flow works end-to-end before the real escrow (Phase 4) lands.
