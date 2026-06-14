# Claude Code Master Prompt — AI Move Contract Auditor
### Copy-paste this directly into Claude Code to build the full production system

---

## HOW TO USE THIS PROMPT

**Option A — Claude Code Terminal:**
```bash
claude
```
Then paste this entire file content as your first message.

**Option B — Claude Code with file reference:**
```bash
claude --file claude_code_master_prompt.md
```

**Option C — Per-phase (recommended for large codebase):**
Copy only the PHASE section you are currently building and paste it into Claude Code. Each phase is self-contained.

---

## MASTER CONTEXT (include this in every session)

```
You are helping me build "MoveAuditor" — a production SaaS platform for AI-powered 
Sui Move smart contract security auditing. 

TECH STACK (non-negotiable):
- Backend: NestJS (TypeScript), modular architecture
- Frontend: Next.js 14 App Router (TypeScript)
- Database: PostgreSQL with Prisma ORM
- Queue: BullMQ + Redis
- AI: Anthropic Claude API (model: claude-sonnet-4-20250514)
- Storage: Walrus Testnet (HTTP publisher at https://publisher-devnet.walrus.space)
- Blockchain: Sui Testnet (getFullnodeUrl('testnet'))
- Email: Resend + React Email
- Payments: Stripe
- Monorepo: Turborepo with apps/api, apps/web, apps/contracts, packages/shared-types

CODING STANDARDS:
- Every NestJS service is @Injectable() and uses constructor DI
- Every module has its own .module.ts that imports/exports its dependencies
- Prisma client is injected via a global PrismaModule, never instantiated directly
- All DTOs use class-validator decorators (@IsString(), @IsUUID(), etc.)
- All controllers use @UseGuards() — never expose unauthenticated endpoints
- All async functions use try/catch and throw NestJS HTTP exceptions
- No console.log — use the AppLogger service
- All environment variables are accessed via process.env.VARIABLE_NAME
- TypeScript strict mode is ON — no implicit any, no unchecked types
- Every new Prisma model gets a corresponding repository class
- BullMQ processors extend WorkerHost and are decorated with @Processor()

PROJECT STRUCTURE:
apps/
├── api/src/
│   ├── modules/
│   │   ├── audit/           # single contract audit (existing)
│   │   ├── claude/          # Claude API integration (existing)
│   │   ├── walrus/          # Walrus storage (existing)
│   │   ├── report/          # report rendering (existing)
│   │   ├── auth/            # JWT + OAuth + Sui wallet auth (NEW)
│   │   ├── users/           # user CRUD (NEW)
│   │   ├── organizations/   # team/org management (NEW)
│   │   ├── billing/         # Stripe integration (NEW)
│   │   ├── api-keys/        # developer API keys (NEW)
│   │   ├── rate-limiting/   # Redis per-plan rate limits (NEW)
│   │   ├── email/           # Resend transactional email (NEW)
│   │   ├── on-chain/        # Sui Move registry anchor (NEW)
│   │   ├── github/          # GitHub repo scanning (NEW)
│   │   ├── repo-audit/      # GitHub repo audit pipeline (NEW)
│   │   ├── metrics/         # cost + usage tracking (NEW)
│   │   └── admin/           # admin dashboard API (NEW)
│   └── common/
│       ├── guards/
│       ├── decorators/
│       └── pipes/
├── web/                     # Next.js frontend
└── contracts/               # Sui Move contracts

ENVIRONMENT VARIABLES (already set in .env):
ANTHROPIC_API_KEY=sk-ant-...
WALRUS_PUBLISHER_URL=https://publisher-devnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator-devnet.walrus.space
DATABASE_URL=postgresql://postgres:password@localhost:5432/move_auditor
REDIS_HOST=localhost
REDIS_PORT=6379
FRONTEND_URL=http://localhost:3000
JWT_ACCESS_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
GITHUB_TOKEN=ghp_...
SUI_BACKEND_PRIVATE_KEY=<base64 private key>
REGISTRY_PACKAGE_ID=0x...
REGISTRY_OBJECT_ID=0x...
```

---

## PHASE 1 PROMPT — Authentication & User System

```
CONTEXT: I am building MoveAuditor (full context above). 
I need you to build the complete authentication system.

BUILD THESE FILES IN ORDER:

1. prisma/schema.prisma — Add these models to the existing schema:

   model User {
     id            String    @id @default(uuid())
     email         String    @unique
     passwordHash  String?
     emailVerified Boolean   @default(false)
     googleId      String?   @unique
     suiAddress    String?   @unique
     name          String?
     avatarUrl     String?
     createdAt     DateTime  @default(now())
     updatedAt     DateTime  @updatedAt
     orgId         String?
     role          UserRole  @default(MEMBER)
     organization  Organization? @relation(fields: [orgId], references: [id])
     subscription  Subscription?
     apiKeys       ApiKey[]
     audits        Audit[]
     @@index([email])
     @@index([suiAddress])
   }

   model Organization {
     id           String   @id @default(uuid())
     name         String
     slug         String   @unique
     createdAt    DateTime @default(now())
     members      User[]
     audits       Audit[]
     subscription Subscription?
   }

   enum UserRole { OWNER ADMIN MEMBER VIEWER }

   model EmailVerificationToken {
     id        String    @id @default(uuid())
     userId    String
     token     String    @unique
     expiresAt DateTime
     usedAt    DateTime?
     user      User      @relation(fields: [userId], references: [id])
   }

   model RefreshToken {
     id         String    @id @default(uuid())
     userId     String
     token      String    @unique
     expiresAt  DateTime
     revokedAt  DateTime?
     deviceInfo String?
     user       User      @relation(fields: [userId], references: [id])
     @@index([userId])
   }

2. src/modules/auth/auth.module.ts
   - Imports: JwtModule (access 15m + refresh 7d), PassportModule
   - Imports: UsersModule, EmailModule
   - Providers: AuthService, SuiAuthService, JwtStrategy, LocalStrategy
   - Controllers: AuthController

3. src/modules/auth/auth.controller.ts
   Routes:
   - POST /auth/register → { email, password, name } → create user, send verify email
   - POST /auth/login → { email, password } → return { accessToken, user }
   - POST /auth/refresh → { refreshToken } (httpOnly cookie) → new accessToken
   - POST /auth/logout → revoke refresh token
   - GET  /auth/verify-email?token=xxx → mark email verified
   - POST /auth/forgot-password → { email } → send reset link
   - POST /auth/reset-password → { token, newPassword }
   - GET  /auth/sui/nonce?address=xxx → return nonce string (store in Redis 5min)
   - POST /auth/sui/verify → { address, signedMessage, signature } → JWT
   - GET  /auth/google → redirect to Google OAuth
   - GET  /auth/google/callback → handle OAuth callback

4. src/modules/auth/auth.service.ts
   - register(): hash password with bcrypt(10), create User, create EmailVerificationToken, call EmailService.sendEmailVerification()
   - login(): find user, compare password, issue accessToken (JWT 15m) + refreshToken (JWT 7d, store hashed in DB)
   - refresh(): find hashed refreshToken in DB, verify not revoked/expired, issue new accessToken
   - verifyEmail(): find token, check expiry, set emailVerified=true, delete token
   - generateJwt(): payload = { sub: userId, email, role, orgId, plan }

5. src/modules/auth/sui-auth.service.ts
   - generateNonce(address): build nonce string, store in Redis with key nonce:{address}, TTL 300s, return nonce
   - verifySuiSignature(address, signedMessage, signature):
     * Get nonce from Redis, verify not expired
     * Call verifyPersonalMessageSignature from @mysten/sui/verify
     * If valid: delete nonce from Redis, upsert User by suiAddress
     * Return user + JWT

6. src/modules/auth/strategies/jwt.strategy.ts
   - Validates Bearer token from Authorization header
   - Returns { userId, email, role, orgId, plan } as request.user

7. src/modules/users/users.module.ts + users.service.ts + users.repository.ts
   - findById(), findByEmail(), findBySuiAddress()
   - upsertBySuiAddress(): create if not exists, return if exists
   - updateProfile(), deleteUser()

8. src/common/decorators/current-user.decorator.ts
   - @CurrentUser() pulls req.user from request context

9. src/common/guards/jwt-auth.guard.ts
   - Standard NestJS JWT guard that throws 401 if no valid token

RULES:
- Passwords: bcrypt with saltRounds=10, never store plaintext
- Access token in Authorization header, refresh token in httpOnly cookie
- All tokens stored hashed in DB (bcrypt for refresh tokens)
- Email verification required before audit submission allowed
- Sui nonce must be consumed (deleted from Redis) immediately on use — no replay
- After generating, return refreshToken as httpOnly Secure cookie, never in body

After building, run: npx prisma migrate dev --name add_auth_models
Then test: POST /auth/register with { email, password, name }
```

---

## PHASE 2 PROMPT — Stripe Billing System

```
CONTEXT: MoveAuditor auth system is complete. Now build Stripe billing.

PRICING PLANS:
- FREE: 3 audits/month, basic findings, 30-day Walrus storage, watermarked
- DEVELOPER ($49/mo): 25 audits/month, full findings, permanent Walrus, PDF export, compare/diff
- TEAM ($199/mo): 100 audits/month, everything in Developer, 5 members, API access, Slack, priority queue
- ENTERPRISE (custom): unlimited audits, dedicated context, SLA, white-label, SSO
- PAY_AS_YOU_GO: $5/audit, no subscription

ON-CHAIN AUDIT REGISTRY IS INCLUDED IN ALL PLANS (free and paid).

BUILD THESE FILES:

1. prisma/schema.prisma — Add:

   model Subscription {
     id                   String             @id @default(uuid())
     userId               String?            @unique
     orgId                String?            @unique
     stripeCustomerId     String             @unique
     stripeSubscriptionId String?            @unique
     stripePriceId        String?
     plan                 PlanType           @default(FREE)
     status               SubscriptionStatus @default(ACTIVE)
     currentPeriodStart   DateTime?
     currentPeriodEnd     DateTime?
     cancelAtPeriodEnd    Boolean            @default(false)
     auditsUsedThisPeriod Int                @default(0)
     auditsLimit          Int                @default(3)
     createdAt            DateTime           @default(now())
     updatedAt            DateTime           @updatedAt
     user                 User?              @relation(fields: [userId], references: [id])
     org                  Organization?      @relation(fields: [orgId], references: [id])
   }

   enum PlanType { FREE PAY_AS_YOU_GO DEVELOPER TEAM ENTERPRISE }
   enum SubscriptionStatus { ACTIVE PAST_DUE CANCELED TRIALING INCOMPLETE }

2. src/modules/billing/billing.module.ts
3. src/modules/billing/billing.controller.ts
   Routes:
   - POST /billing/checkout → { priceId } → returns { checkoutUrl }
   - POST /billing/webhook → raw body (Stripe webhook, no auth guard)
   - GET  /billing/portal → returns { portalUrl } (Stripe customer portal)
   - GET  /billing/status → returns current subscription for logged-in user

4. src/modules/billing/billing.service.ts
   Methods:
   - createCheckoutSession(userId, priceId): get/create Stripe customer, create checkout session
   - handleWebhook(rawBody, signature): verify with STRIPE_WEBHOOK_SECRET, switch on event.type:
     * checkout.session.completed → activate subscription in DB
     * invoice.paid → resetMonthlyUsage(), sendInvoiceConfirmation email
     * invoice.payment_failed → set status=PAST_DUE, send payment failed email
     * customer.subscription.deleted → set status=CANCELED, downgrade to FREE
     * customer.subscription.updated → sync plan changes
   - createPortalSession(userId): Stripe billing portal URL
   - getStatus(userId): return subscription with plan, usage, limits

5. src/modules/billing/billing.repository.ts
   - findByUserId(), findByStripeCustomerId()
   - activateSubscription(), resetMonthlyUsage()
   - incrementUsage(userId, count): atomic increment of auditsUsedThisPeriod

6. src/modules/audit/guards/audit-quota.guard.ts
   @Injectable() guard that:
   - Gets user from request
   - Calls subscriptionService.getForUser(userId)
   - Throws ForbiddenException({ error: 'QUOTA_EXCEEDED', upgradeUrl: '/pricing', resetDate }) if used >= limit
   - Apply this guard to POST /audit/submit

IMPORTANT STRIPE NOTES:
- Webhook endpoint must use raw body parser (app.use('/billing/webhook', express.raw({ type: '*/*' })))
- Never trust Stripe data without webhook signature verification
- Your DB is source of truth for usage; Stripe is only for charging
- Use Stripe API version 2025-03-31 (metered billing uses Meters API, not legacy usage_type)

STRIPE PRICE IDs to create in Stripe Dashboard:
- Developer Monthly: price_developer_monthly
- Team Monthly: price_team_monthly
- Pay As You Go: price_payg_per_audit (one-time, $5)

After building, test webhook locally with: stripe listen --forward-to localhost:3001/billing/webhook
```

---

## PHASE 3 PROMPT — API Key System + Rate Limiting

```
CONTEXT: Auth and billing are complete. Now build API keys for Team/Enterprise users 
and Redis-enforced rate limiting for all plans.

BUILD THESE FILES:

1. prisma/schema.prisma — Add:

   model ApiKey {
     id         String    @id @default(uuid())
     userId     String
     name       String
     keyHash    String    @unique
     keyPrefix  String
     scopes     String[]
     rateLimit  Int?
     lastUsedAt DateTime?
     expiresAt  DateTime?
     revokedAt  DateTime?
     createdAt  DateTime  @default(now())
     user       User      @relation(fields: [userId], references: [id])
     @@index([userId])
   }

2. src/modules/api-keys/api-keys.module.ts
3. src/modules/api-keys/api-keys.controller.ts
   Routes (all require JwtAuthGuard + PlanGuard(TEAM)):
   - POST   /api-keys → { name, scopes } → create key, return rawKey ONCE
   - GET    /api-keys → list user's keys (never return keyHash)
   - DELETE /api-keys/:id → revoke key (set revokedAt)

4. src/modules/api-keys/api-keys.service.ts
   - createKey(userId, name, scopes):
     * Generate: rawKey = "maud_" + crypto.randomBytes(32).hex()
     * keyPrefix = rawKey.substring(0, 12)
     * keyHash = bcrypt.hash(rawKey, 10)
     * Save to DB, return { key: rawKey, apiKey } — rawKey shown ONCE only
   - validateKey(rawKey):
     * prefix = rawKey.substring(0, 12)
     * Find candidates by keyPrefix where revokedAt is null
     * bcrypt.compare() each candidate
     * If match: update lastUsedAt async (fire-and-forget), return ApiKey
     * If no match: return null
   - revokeKey(keyId, userId): set revokedAt = now(), verify ownership

5. src/common/guards/flexible-auth.guard.ts
   Accepts EITHER JWT OR API key:
   - If Authorization starts with "Bearer maud_" → validate as API key
   - If Authorization starts with "Bearer eyJ" → validate as JWT
   - Attach user to request.user in both cases
   - Throw UnauthorizedException if neither

6. src/modules/rate-limiting/rate-limit.module.ts
7. src/modules/rate-limiting/rate-limit.service.ts

   PLAN LIMITS:
   const PLAN_LIMITS = {
     FREE:          { perMinute: 2,   perHour: 5,    perDay: 10   },
     PAY_AS_YOU_GO: { perMinute: 5,   perHour: 20,   perDay: 50   },
     DEVELOPER:     { perMinute: 10,  perHour: 50,   perDay: 150  },
     TEAM:          { perMinute: 30,  perHour: 200,  perDay: 500  },
     ENTERPRISE:    { perMinute: 100, perHour: 1000, perDay: 5000 },
   };

   - checkAndIncrement(userId, plan):
     * Keys: rl:{userId}:minute:{epoch_minute}, :hour:{epoch_hour}, :day:{epoch_day}
     * Use atomic Lua script: INCR all three keys, set EXPIRE on first increment
     * Return { allowed: boolean, remaining: number, resetAt: Date }
     * If not allowed: throw TooManyRequestsException with Retry-After header

8. src/common/guards/rate-limit.guard.ts
   - Gets user plan from request.user.plan
   - Calls RateLimitService.checkAndIncrement()
   - Sets response headers: X-RateLimit-Remaining, X-RateLimit-Reset

APPLY GUARDS TO AUDIT ENDPOINTS:
@Post('/submit')
@UseGuards(FlexibleAuthGuard, RateLimitGuard, AuditQuotaGuard)
async submitAudit() {}

SCOPES FOR API KEYS:
- "audit:create" — submit audits
- "audit:read"  — read audit history
- "report:read" — read reports
- "repo:create" — submit repo audits
```

---

## PHASE 4 PROMPT — On-Chain Audit Registry (Sui Move)

```
CONTEXT: Building the Sui Move on-chain audit registry. Every audit on every plan 
gets anchored on-chain. This is a universal feature, not plan-gated.

BUILD THESE FILES:

1. apps/contracts/Move.toml:
   [package]
   name = "move_auditor"
   version = "0.0.1"
   [dependencies]
   Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "testnet" }
   [addresses]
   move_auditor = "0x0"

2. apps/contracts/sources/audit_registry.move:
   module move_auditor::registry {
     use sui::object::{Self, UID};
     use sui::tx_context::{Self, TxContext};
     use sui::transfer;
     use sui::event;
     use sui::table::{Self, Table};

     struct AuditRegistry has key {
       id: UID,
       records: Table<vector<u8>, AuditRecord>,
       total_audits: u64,
     }

     struct AuditRecord has store, copy, drop {
       contract_hash: vector<u8>,
       walrus_blob_id: vector<u8>,
       overall_risk: u8,          // 0=Clean 1=Low 2=Medium 3=High 4=Critical
       audited_at: u64,
       auditor_address: address,
     }

     struct AuditAnchored has copy, drop {
       contract_hash: vector<u8>,
       walrus_blob_id: vector<u8>,
       overall_risk: u8,
       audited_at: u64,
     }

     fun init(ctx: &mut TxContext) {
       transfer::share_object(AuditRegistry {
         id: object::new(ctx),
         records: table::new(ctx),
         total_audits: 0,
       });
     }

     public entry fun anchor_audit(
       registry: &mut AuditRegistry,
       contract_hash: vector<u8>,
       walrus_blob_id: vector<u8>,
       overall_risk: u8,
       ctx: &mut TxContext
     ) {
       table::add(&mut registry.records, contract_hash, AuditRecord {
         contract_hash, walrus_blob_id, overall_risk,
         audited_at: tx_context::epoch_timestamp_ms(ctx),
         auditor_address: tx_context::sender(ctx),
       });
       registry.total_audits = registry.total_audits + 1;
       event::emit(AuditAnchored { contract_hash, walrus_blob_id, overall_risk,
         audited_at: tx_context::epoch_timestamp_ms(ctx) });
     }

     public fun verify_audit(registry: &AuditRegistry, contract_hash: vector<u8>): bool {
       table::contains(&registry.records, contract_hash)
     }
   }

3. apps/contracts/tests/audit_registry_tests.move:
   Write tests for: init creates shared object, anchor_audit adds record and emits event,
   verify_audit returns true for anchored contract, verify_audit returns false for unknown

4. src/modules/on-chain/on-chain.module.ts
5. src/modules/on-chain/on-chain-registry.service.ts:
   
   import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
   import { Transaction } from '@mysten/sui/transactions';
   import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

   @Injectable()
   export class OnChainRegistryService {
     private client = new SuiClient({ url: getFullnodeUrl('testnet') });
     private keypair = Ed25519Keypair.fromSecretKey(process.env.SUI_BACKEND_PRIVATE_KEY);

     async anchorAudit(contractHash: string, blobId: string, riskLevel: number): Promise<string> {
       const tx = new Transaction();
       tx.moveCall({
         target: `${process.env.REGISTRY_PACKAGE_ID}::registry::anchor_audit`,
         arguments: [
           tx.object(process.env.REGISTRY_OBJECT_ID),
           tx.pure.vector('u8', Buffer.from(contractHash, 'hex')),
           tx.pure.vector('u8', Buffer.from(blobId)),
           tx.pure.u8(riskLevel),
         ],
       });
       const result = await this.client.signAndExecuteTransaction({
         signer: this.keypair,
         transaction: tx,
       });
       return result.digest;
     }

     getSuiscanUrl(txDigest: string): string {
       return `https://suiscan.xyz/testnet/tx/${txDigest}`;
     }

     riskLevelToNumber(risk: string): number {
       return { CLEAN: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[risk] ?? 2;
     }
   }

6. Update src/modules/audit/audit.processor.ts — after saving Walrus blobId:
   Add Phase: call onChainRegistryService.anchorAudit(contractHash, blobId, riskLevel)
   Save txDigest to audit record
   This runs for ALL plans — on-chain anchoring is universal

7. Update Audit Prisma model to include:
   onChainTxDigest  String?
   onChainAnchoredAt DateTime?

DEPLOY INSTRUCTIONS TO INCLUDE IN README:
sui client publish --gas-budget 100000000
# Copy PackageID and SharedObjectID from output
# Set REGISTRY_PACKAGE_ID and REGISTRY_OBJECT_ID in .env

RISK LEVEL MAPPING (for on-chain storage as u8):
0 = CLEAN, 1 = LOW, 2 = MEDIUM, 3 = HIGH, 4 = CRITICAL
```

---

## PHASE 5 PROMPT — GitHub Repository Audit Feature

```
CONTEXT: Building the GitHub repo audit feature. This is the hackathon differentiator.
Existing single-contract audit remains unchanged. This adds a parallel flow.

PROJECT TRACKS (used to inject context into Claude prompts):
- INSTITUTIONS_CAPITAL_MARKETS: focus on compliance controls, event emissions, multisig
- AI: focus on model update access control, parameter integrity, reward manipulation
- DEFI: focus on flash loans, oracle manipulation, reentrancy, overflow
- GAMING: focus on randomness manipulation, NFT metadata, marketplace fee bypass
- PAYMENTS: focus on double-spend, overflow in calculations, recipient validation

BUILD THESE FILES:

1. prisma/schema.prisma — Add:

   model RepoAudit {
     id               String         @id @default(uuid())
     createdAt        DateTime       @default(now())
     updatedAt        DateTime       @updatedAt
     userId           String
     user             User           @relation(fields: [userId], references: [id])
     repoUrl          String
     repoOwner        String
     repoName         String
     repoDefaultBranch String
     commitSha        String?
     projectTrack     ProjectTrack
     status           RepoAuditStatus @default(SCANNING)
     contractsFound   Int            @default(0)
     contractsAudited Int            @default(0)
     overallRisk      RiskLevel?
     totalFindings    Int            @default(0)
     criticalCount    Int            @default(0)
     highCount        Int            @default(0)
     mediumCount      Int            @default(0)
     lowCount         Int            @default(0)
     infoCount        Int            @default(0)
     blobId           String?        @unique
     walrusUrl        String?
     onChainTxDigest  String?
     contractAudits   ContractAudit[]
     errorMessage     String?
     @@index([userId])
   }

   model ContractAudit {
     id           String      @id @default(uuid())
     repoAuditId  String
     repoAudit    RepoAudit   @relation(fields: [repoAuditId], references: [id])
     filePath     String
     fileName     String
     fileContent  String      @db.Text
     lineCount    Int
     status       AuditStatus @default(QUEUED)
     overallRisk  RiskLevel?
     findingsJson Json?
     criticalCount Int        @default(0)
     highCount    Int         @default(0)
     mediumCount  Int         @default(0)
     lowCount     Int         @default(0)
     infoCount    Int         @default(0)
     errorMessage String?
     createdAt    DateTime    @default(now())
     @@index([repoAuditId])
   }

   enum ProjectTrack { INSTITUTIONS_CAPITAL_MARKETS AI DEFI GAMING PAYMENTS }
   enum RepoAuditStatus { SCANNING PREVIEW AUDITING AGGREGATING STORING COMPLETE FAILED }

2. src/modules/github/github.module.ts
3. src/modules/github/github.service.ts — implement:
   - parseRepoUrl(url): validate is github.com, extract owner/name
   - scanRepository(repoUrl, includeTests): 
     * GET https://api.github.com/repos/{owner}/{name} → defaultBranch
     * GET https://api.github.com/repos/{owner}/{name}/git/trees/{branch}?recursive=1
     * Filter: type=blob, ends with .move, size < 100KB
     * If !includeTests: filter out paths containing /tests/, /test/, ending in _test.move or _tests.move
     * Throw if 0 files found, throw if > 50 files
     * Return RepoInfo { owner, name, defaultBranch, commitSha, moveFiles }
   - fetchFileContent(downloadUrl): GET raw.githubusercontent.com URL
   - fetchAllMoveFiles(moveFiles): batch of 5 concurrent downloads
   
   Use Authorization: Bearer {GITHUB_TOKEN} header if env var set (5000 req/hr vs 60)

4. src/modules/repo-audit/repo-audit.module.ts
5. src/modules/repo-audit/repo-audit.controller.ts
   Routes (all require FlexibleAuthGuard):
   - POST /repo-audit/scan → { repoUrl, includeTests? }
     * Call githubService.scanRepository()
     * Store result in Redis with scanId key (TTL 10 min)
     * Return { scanId, repoOwner, repoName, commitSha, moveFiles[], estimatedAudits }
     * NO quota deducted at this step
   
   - POST /repo-audit/submit → { scanId, projectTrack, includeTests? }
     * Retrieve scan from Redis
     * Check quota: filesCount <= remaining audits
     * Deduct quota upfront (refund on failure)
     * Create RepoAudit record in DB
     * Add job to REPO_AUDIT_QUEUE
     * Return { repoAuditId, statusUrl }
   
   - GET /repo-audit/:id/status (SSE stream)
     * Stream progress events until COMPLETE or FAILED
   
   - GET /repo-audit/:id/report
     * Return full RepoAudit with nested ContractAudit[]
   
   - GET /repo-audits
     * Return paginated list of user's repo audits

6. src/modules/repo-audit/repo-audit.processor.ts — @Processor(REPO_AUDIT_QUEUE):
   PHASE 1 (5%): fetchAllMoveFiles from GitHub
   PHASE 2 (10–80%): Audit each contract with AUDIT_CONCURRENCY=3:
     - Call claudeService.auditContract(content, fileName, projectTrack)
     - Emit per-file SSE events
     - Save each ContractAudit result to DB immediately
   PHASE 3 (82%): claudeService.analyzeCrossContract(results, projectTrack)
   PHASE 4 (88%): reportService.generateConsolidatedHtml(...)
   PHASE 5 (94%): walrusService.storeReport(htmlReport) → blobId
   PHASE 6 (100%): onChainRegistryService.anchorAudit(), save result, emit complete

7. Update src/modules/claude/claude.service.ts — add:
   - auditContract(code, name, projectTrack?) — pass track context to buildUserPrompt
   - analyzeCrossContract(contractResults, projectTrack):
     * Build summary of all contracts + findings
     * Single Claude call asking for cross-contract risks, systemic patterns,
       missing system features, audit priority order, repositoryRisk, executiveSummary
     * Return JSON: { sharedRisks[], systemicPatterns[], missingSystemFeatures[], 
                      auditPriorityOrder[], repositoryRisk, executiveSummary }

8. Update src/modules/claude/prompts/user-prompt.builder.ts:
   Add TRACK_CONTEXT map for all 5 project tracks.
   Inject track context into the user prompt when projectTrack is provided.

9. src/modules/report/repo-report.service.ts — generateConsolidatedHtml():
   HTML report with sections:
   - Repository header: owner/name, commit SHA, project track, audit date
   - Overall risk badge + total findings count by severity
   - Executive summary (from cross-contract analysis)
   - Cross-contract risks section (sharedRisks[])
   - Per-contract findings (one section per .move file, collapsible)
   - Repository-wide recommendations
   - Walrus permanent storage URL
   - On-chain verification link (suiscan.xyz)

QUOTA REFUND ON FAILURE:
If RepoAuditProcessor throws, catch the error, then:
await subscriptionService.decrementUsage(userId, filesCount)
Then rethrow for BullMQ retry logic.

SSE EVENT SHAPES:
{ event: "progress", data: { step, message, pct, currentFile?, filesAudited?, filesTotal? } }
{ event: "file_complete", data: { fileName, risk, findingCount } }
{ event: "complete", data: { blobId, walrusUrl, onChainTxDigest } }
{ event: "error", data: { message } }
```

---

## PHASE 6 PROMPT — Email System

```
CONTEXT: Building transactional emails with Resend + React Email.

BUILD THESE FILES:

1. Install: npm install resend @react-email/components

2. src/modules/email/email.module.ts — global module

3. src/modules/email/email.service.ts
   All methods send from audits@moveauditor.xyz (or hello@ for auth emails)
   
   Methods to implement:
   - sendWelcome(email, name)
   - sendEmailVerification(email, verifyUrl)  
   - sendPasswordReset(email, resetUrl)
   - sendAuditComplete(email, { contractName, riskLevel, criticalCount, highCount, mediumCount, reportUrl, walrusUrl, onChainUrl })
   - sendRepoAuditComplete(email, { repoName, riskLevel, contractsAudited, totalFindings, reportUrl, walrusUrl })
   - sendAuditFailed(email, { contractName, errorMessage })
   - sendQuotaWarning(email, { used, limit, resetDate, upgradeUrl })
   - sendQuotaExceeded(email, { limit, resetDate, upgradeUrl })
   - sendInvoiceConfirmation(email, { amount, plan, invoiceUrl })
   - sendPaymentFailed(email, { amount, updatePaymentUrl })

4. src/modules/email/templates/audit-complete.tsx — React Email template:
   - Header with MoveAuditor logo
   - Contract name + risk badge (color coded: red=CRITICAL, orange=HIGH, yellow=MEDIUM, green=LOW/CLEAN)
   - Finding counts: Critical X | High X | Medium X
   - CTA button: "View Full Report" → reportUrl
   - "Permanent Report URL" text link → walrusUrl
   - "On-chain Verification" text link → suiscan.xyz link
   - Footer

5. src/modules/email/templates/email-verify.tsx
6. src/modules/email/templates/welcome.tsx
7. src/modules/email/templates/quota-warning.tsx — shows usage bar
8. src/modules/email/templates/payment-failed.tsx — urgent styling

TRIGGER POINTS (wire these up):
- After auth.service.register() → sendWelcome() + sendEmailVerification()
- After audit.processor completes → sendAuditComplete()
- After audit.processor fails (after max retries) → sendAuditFailed()
- After billing.service.handleInvoicePaid() → sendInvoiceConfirmation()
- After billing.service.handlePaymentFailed() → sendPaymentFailed()
- In audit-quota.guard when usage reaches 80% → sendQuotaWarning() (check this threshold before throwing)
- In audit-quota.guard when quota exceeded → sendQuotaExceeded()
```

---

## PHASE 7 PROMPT — Security Hardening

```
CONTEXT: Hardening the NestJS API for production.

BUILD / MODIFY THESE FILES:

1. src/main.ts — add all security middleware:
   - helmet() with contentSecurityPolicy: true, crossOriginEmbedderPolicy: false
   - express-rate-limit: 200 req per 15 min per IP (global, before per-user limits)
   - enableCors({ origin: [process.env.FRONTEND_URL], credentials: true })
   - ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
   - Raw body parser for /billing/webhook BEFORE ValidationPipe

2. src/common/pipes/move-validation.pipe.ts — upgrade existing:
   Checks in order:
   a) Size: Buffer.byteLength(code, 'utf8') > 50 * 1024 → throw 400
   b) Must contain 'module' or 'script' keyword → throw 400
   c) Prompt injection patterns (case insensitive):
      - /ignore.*previous.*instructions/i
      - /system.*prompt/i  
      - /you are now/i
      - /forget.*instructions/i
      - /disregard.*above/i
      - /new persona/i
      → throw BadRequestException('Invalid contract content detected')
   d) Check for suspicious base64 blobs (length > 1000 chars with no spaces)
   e) Return sanitized value (trimmed, normalized line endings)

3. src/common/filters/http-exception.filter.ts:
   Global exception filter that:
   - Logs all 5xx errors via AppLogger
   - Returns consistent JSON: { statusCode, error, message, timestamp, path }
   - Never leaks stack traces in error responses
   - Sends alert webhook for 5xx errors

4. src/common/interceptors/logging.interceptor.ts:
   Logs every request: { method, path, userId, statusCode, latencyMs }
   Uses AppLogger, not console.log

5. src/common/logger/logger.service.ts — pino-based structured logger:
   Methods: auditStarted(), claudeCall(), auditComplete(), auditFailed(),
            repoAuditStarted(), repoAuditComplete(), httpRequest()
   All log as JSON with event field for easy parsing

6. Update all existing controllers to:
   - Add @UseGuards(JwtAuthGuard) or @UseGuards(FlexibleAuthGuard)  
   - Add @CurrentUser() decorator to extract user from request
   - Remove any hardcoded userId from request body (always take from JWT)

7. src/modules/admin/admin.guard.ts:
   Checks request.user.role === 'ADMIN' or 'OWNER', throws ForbiddenException if not

ADDITIONAL SECURITY RULES:
- Never log request bodies (may contain contract code or credentials)
- Always validate UUIDs in route params with @IsUUID() 
- Stripe webhook: verify signature BEFORE processing, return 200 immediately after verification
- Rate limit the /auth/forgot-password endpoint separately: 3 req/hour per email
- Add CORS preflight cache: maxAge: 3600
```

---

## PHASE 8 PROMPT — Frontend: Auth + Dashboard + Audit Flow

```
CONTEXT: Building the Next.js 14 App Router frontend with complete UI.

DESIGN SYSTEM:
- Colors: Dark theme. Primary: #6366f1 (indigo). Background: #0f0f0f. Card: #1a1a1a
- Risk colors: CRITICAL=#dc2626, HIGH=#ea580c, MEDIUM=#ca8a04, LOW=#16a34a, CLEAN=#16a34a
- Font: Inter for UI, JetBrains Mono for code/contract display
- Tailwind CSS for all styling
- lucide-react for icons

BUILD THESE PAGES AND COMPONENTS:

── AUTH PAGES ──

1. app/(auth)/layout.tsx — centered card layout, no sidebar
2. app/(auth)/register/page.tsx:
   - Name, email, password, confirm password fields
   - "Sign up with Google" button
   - "Sign in with Sui wallet" button (calls /auth/sui/nonce then wallet sign)
   - Link to login
   - On success: show "Check your email" screen

3. app/(auth)/login/page.tsx:
   - Email + password form
   - "Sign in with Google" button  
   - "Sign in with Sui wallet" button
   - "Forgot password?" link
   - Link to register

4. app/(auth)/verify-email/page.tsx:
   - Reads ?token= from URL, calls /auth/verify-email
   - Shows success/error state

── DASHBOARD LAYOUT ──

5. app/(dashboard)/layout.tsx:
   - Left sidebar with nav: Dashboard, New Audit, History, API Keys, Settings, Billing
   - Top bar: user avatar, plan badge, logout
   - Main content area

6. app/(dashboard)/dashboard/page.tsx:
   Usage bar: X/Y audits this month, resets [date]
   Recent audits table: contractName, riskBadge, timestamp, [View] [Re-audit] buttons
   Quick submit CTA: "Start New Audit"

7. app/(dashboard)/history/page.tsx:
   Full audit history with:
   - Filter by: risk level, audit type (single/repo), date range
   - Sort by: date, risk, contract name
   - Both single-contract audits AND repo audits in same list
   - Pagination

── AUDIT SUBMISSION FLOW ──

8. app/page.tsx (landing / new audit):
   STEP 1: ProjectTrackSelector component — 5 cards in a row
   STEP 2: AuditMethodSelector — Single Contract OR GitHub Repo cards
   STEP 3A (single): Monaco editor for contract code
   STEP 3B (repo): GitHub URL input + options checkboxes
   Submit button → call appropriate API endpoint
   On success → redirect to /audit/[id] or /repo-audit/[id]

9. components/ProjectTrackSelector.tsx:
   Five clickable cards: 🏦 Institutions, 🤖 AI, 💰 DeFi, 🎮 Gaming, 💳 Payments
   Selected card has indigo border + background tint
   Required before submit is enabled

10. components/AuditMethodSelector.tsx:
    Two large cards side by side:
    Left: 📄 Single Contract — "Upload or paste one .move file"
    Right: 🐙 GitHub Repository — "Paste your GitHub URL. We find all .move files automatically."
    
11. components/RepoScanPreview.tsx:
    After POST /repo-audit/scan returns:
    - "Found X Move contracts in owner/repo"
    - Table: filename, path, size, lines — with ✓ or ✗ (skipped tests)
    - "Estimated audit time: ~X minutes"
    - "This will use X of your Y monthly audits"
    - [Run Full Audit] and [Cancel] buttons

── PROGRESS PAGES ──

12. app/audit/[id]/page.tsx (single contract progress):
    SSE consumer connecting to /audit/:id/status
    Animated step tracker: Submitted → Parsing → Analyzing → Scoring → Uploading → Complete
    On complete: auto-redirect to /report/[blobId] after 2 seconds

13. app/repo-audit/[id]/page.tsx (repo progress):
    SSE consumer connecting to /repo-audit/:id/status
    Per-file progress list: each file shows queued/auditing/done with risk badge
    Overall progress bar
    On complete: auto-redirect to /repo-report/[blobId]

── REPORT PAGES ──

14. app/report/[blobId]/page.tsx (single contract report):
    - Contract name + overall risk badge
    - Finding counts: chips for Critical/High/Medium/Low/Info
    - Findings table (sortable by severity)
    - Per-finding accordion: title, severity badge, location, description, impact, fix, code snippet
    - Walrus section: permanent URL + copy button
    - On-chain section: suiscan.xyz link + tx digest
    - Share button
    - Re-audit button

15. app/repo-report/[blobId]/page.tsx (consolidated repo report):
    - Repo name + commit SHA + project track badge
    - Overall risk + total findings
    - Executive summary
    - Cross-contract risks section (sharedRisks with severity badges)
    - Per-contract findings (one collapsible section per .move file)
    - Repository-wide recommendations
    - Walrus + on-chain links

── BILLING & SETTINGS ──

16. app/pricing/page.tsx:
    Comparison table: FREE | DEVELOPER | TEAM | ENTERPRISE
    Each plan shows all features including "On-chain audit registry ✓" on all plans
    Stripe checkout buttons

17. app/(dashboard)/billing/page.tsx:
    Current plan, usage meter, next reset date
    Upgrade/downgrade buttons
    Invoice history
    "Manage Billing" → Stripe portal link

18. app/(dashboard)/api-keys/page.tsx (Team plan+):
    List of API keys: name, prefix, lastUsed, scopes
    "Create New Key" modal: name + scope selector
    Show raw key ONCE in modal after creation (copy button)
    Revoke button per key

── SHARED COMPONENTS ──

19. components/RiskBadge.tsx:
    Props: { risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAN' | 'INFO' }
    Colored pill badge, correct colors from design system

20. components/WalrusLink.tsx:
    Shows blobId URL, copy button, "View on Walrus" external link
    "Permanent tamper-proof storage" label

21. lib/api.ts — typed API client:
    All fetch calls with Authorization header from localStorage JWT
    Auto-refresh on 401 using refresh token cookie

22. lib/sse.ts — useAuditProgress hook:
    Connects to SSE endpoint, returns { progress, complete, error }
    Auto-reconnect on disconnect
    Cleanup on unmount
```

---

## PHASE 9 PROMPT — Admin Panel + Observability

```
CONTEXT: Building internal tools for monitoring and business operations.

BUILD THESE FILES:

1. src/modules/metrics/metrics.module.ts
2. src/modules/metrics/metrics.service.ts
   Methods:
   - recordClaudeCall({ auditId, inputTokens, outputTokens, latencyMs }):
     * cost = (inputTokens/1M * 3.00) + (outputTokens/1M * 15.00)
     * Save to ClaudeCallLog model
   - getDashboardMetrics(): return DashboardMetrics interface:
     {
       mrr: number,
       newSubscriptionsToday: number,
       churnedSubscriptionsThisMonth: number,
       auditsToday: number,
       auditsThisMonth: number,
       avgAuditLatencyMs: number,
       claudeCostToday: number,
       claudeCostThisMonth: number,
       grossMarginPercent: number,
       avgFindingsPerAudit: number,
       criticalFindingsThisMonth: number,
       queueDepth: number,
       failedAuditsToday: number,
       walrusSuccessRateToday: number,
     }

3. prisma/schema.prisma — Add:
   model ClaudeCallLog {
     id           String   @id @default(uuid())
     auditId      String?
     inputTokens  Int
     outputTokens Int
     latencyMs    Int
     costUsd      Float
     createdAt    DateTime @default(now())
     @@index([createdAt])
   }

4. src/modules/admin/admin.controller.ts (requires AdminGuard):
   - GET /admin/metrics → DashboardMetrics
   - GET /admin/users → paginated user list with plan, usage, created date
   - GET /admin/users/:id → user detail with all audits
   - PATCH /admin/users/:id/plan → override user plan (for enterprise deals)
   - GET /admin/audits → recent audits with status, cost, latency

5. app/admin/page.tsx (admin role only, redirect non-admins):
   Dashboard with metrics cards:
   - MRR, New subscribers today, Churn this month
   - Audits today / this month
   - Claude cost today / this month / gross margin %
   - Queue depth, Failed audits today, Walrus success rate
   Recent audits table

6. Error alerting — update audit.processor.ts onFailed():
   After max retries, POST to process.env.ALERT_WEBHOOK_URL:
   {
     text: "🚨 Audit failed\nID: {auditId}\nUser: {userId}\nError: {message}\nPhase: {phase}"
   }
   This webhook can be a Slack or Discord webhook URL

7. Update claude.service.ts — after every API call:
   const start = Date.now();
   // ... make call ...
   await metricsService.recordClaudeCall({
     auditId,
     inputTokens: response.usage.input_tokens,
     outputTokens: response.usage.output_tokens,
     latencyMs: Date.now() - start,
   });
```

---

## PHASE 10 PROMPT — Embeddable Badge + Multi-Pass Audit + Contract Deduplication

```
CONTEXT: Final production quality features.

BUILD THESE:

1. Embeddable Badge endpoint in src/modules/report/report.controller.ts:
   GET /badge/:blobId → returns SVG (Content-Type: image/svg+xml, Cache-Control: max-age=86400)
   
   SVG design:
   - Width 200, height 20
   - Left panel (120px): dark gray #555, text "MoveAuditor" in white monospace
   - Right panel (80px): risk color, text = risk level in white monospace
   - Rounded corners rx=3
   - Risk colors: CLEAN=#16a34a, LOW=#84cc16, MEDIUM=#ca8a04, HIGH=#dc2626, CRITICAL=#7f1d1d

   Usage for README: ![MoveAuditor](https://api.moveauditor.xyz/badge/{blobId})

2. Multi-pass audit in src/modules/claude/claude.service.ts:
   Add deepDiveFinding(contractCode, finding):
   - Only called for CRITICAL and HIGH severity findings
   - Sends finding details + full contract back to Claude
   - Asks: confirm exploitable? rate confidence 1-10, show attack vector, refined fix
   - Returns { confirmed, confidence, attackVector, refinedRecommendation }
   
   Update auditContract() flow:
   Pass 1: initial scan (existing)
   Pass 2: for each CRITICAL/HIGH finding, call deepDiveFinding()
   Filter: remove findings where confirmed=false OR confidence < 7
   Add: attackVector and refinedRecommendation to confirmed findings

3. Contract hash deduplication in src/modules/audit/audit.processor.ts:
   At start of process():
   - contractHash = createHash('sha256').update(contractCode).digest('hex')
   - existing = await auditRepository.findByHash(contractHash)
   - If existing and existing.status === 'COMPLETE':
     * Clone result: new Audit record with same findings/blobId/walrusUrl
     * Still call onChainRegistryService.anchorAudit() (different user = different on-chain record)
     * Emit complete event immediately
     * Log: "Cache hit for contract hash, saved Claude API call"
     * Return early
   - If not found: proceed with audit, save hash to audit record after completion

4. Audit diff service src/modules/audit/audit-diff.service.ts:
   compareAudits(previousAuditId, currentAuditId) → AuditDiff:
   interface AuditDiff {
     fixed: AuditFinding[]        // in prev, not in curr (by category + function)
     regressed: AuditFinding[]    // in curr, not in prev
     unchanged: AuditFinding[]    // in both
     riskChange: 'IMPROVED' | 'REGRESSED' | 'UNCHANGED'
     fixedCount: number
     regressedCount: number
   }
   
   Match findings by: category + location.module + location.function
   riskChange logic: compare overallRisk of prev vs curr using CLEAN<LOW<MEDIUM<HIGH<CRITICAL order

5. GET /audit/compare?previous=:id&current=:id endpoint
   Returns AuditDiff object
   Used by app/(dashboard)/compare/page.tsx
```

---

## QUICK REFERENCE — Common Patterns

```typescript
// ── Starting a new NestJS module ──
// 1. Create module file with imports
// 2. Create service with @Injectable()
// 3. Create controller with @Controller('route')
// 4. Add module to app.module.ts imports[]
// 5. Export service if other modules need it

// ── Protecting a route ──
@Get('/protected')
@UseGuards(FlexibleAuthGuard, RateLimitGuard)
async protectedRoute(@CurrentUser() user: JwtPayload) {
  return this.service.doSomething(user.sub);
}

// ── Plan-gating a feature ──
@Post('/team-feature')
@UseGuards(JwtAuthGuard, PlanGuard)
@PlanRequired('TEAM')
async teamOnlyFeature() {}

// ── Admin-only endpoint ──
@Get('/admin/data')
@UseGuards(JwtAuthGuard, AdminGuard)
async adminData() {}

// ── SSE endpoint pattern ──
@Sse('/audit/:id/status')
@UseGuards(JwtAuthGuard)
statusStream(@Param('id') id: string): Observable<MessageEvent> {
  return this.auditGateway.getStream(id);
}

// ── Calling Claude API ──
const response = await this.client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: userPrompt }],
});
const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
const result = JSON.parse(text.replace(/```json\n?|```\n?/g, '').trim());

// ── Storing on Walrus ──
const response = await axios.put(
  `${PUBLISHER_URL}/v1/blobs?epochs=5`,
  htmlContent,
  { headers: { 'Content-Type': 'text/html; charset=utf-8' }, timeout: 30_000 }
);
const blobId = response.data?.newlyCreated?.blobObject?.id 
            || response.data?.alreadyCertified?.blobId;
```

---

## IMPORTANT RULES FOR CLAUDE CODE

1. **Never regenerate working code.** If a file already exists and works, only modify the specific functions that need changing.

2. **Always run prisma migrate after schema changes:**
   ```bash
   npx prisma migrate dev --name <descriptive_name>
   npx prisma generate
   ```

3. **Test each phase before starting the next.** Each phase has a natural test point.

4. **File naming conventions:**
   - Services: `feature.service.ts`
   - Controllers: `feature.controller.ts`  
   - Modules: `feature.module.ts`
   - Guards: `feature-name.guard.ts`
   - DTOs: `action-feature.dto.ts`

5. **Import order in every TypeScript file:**
   - Node.js built-ins first
   - Third-party packages second
   - Internal modules third
   - Relative imports last

6. **Environment variables:** Never hardcode. Always use `process.env.VAR_NAME`. If a variable might be undefined, throw a startup error rather than failing silently at runtime.

7. **Error messages:** Always return structured JSON errors, never plain strings. Use the format: `{ error: 'ERROR_CODE', message: 'Human readable', details?: any }`

8. **For Walrus:** Always handle BOTH `newlyCreated` and `alreadyCertified` response shapes. The blob may already exist if the same contract was audited before.

9. **For Stripe webhooks:** Always return HTTP 200 immediately after signature verification. Handle the actual processing asynchronously to prevent Stripe retry loops.

10. **For BullMQ jobs:** Always include `attempts: 3` and `backoff: { type: 'exponential', delay: 5000 }` in job options. Handle the `onFailed` event to send alerts and refund quota.
```

---

## APPENDIX — Environment Setup Checklist

```bash
# 1. Start local services
docker compose up -d   # starts postgres + redis

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Run migrations
npx prisma migrate dev

# 5. Seed test data (optional)
npx prisma db seed

# 6. Start development servers
npx turbo dev   # starts both api (3001) and web (3000)

# 7. Test Walrus connection
curl -X PUT "https://publisher-devnet.walrus.space/v1/blobs?epochs=1" \
  -H "Content-Type: text/plain" \
  -d "test blob"
# Should return JSON with blobId

# 8. Test Stripe webhook locally
stripe listen --forward-to localhost:3001/billing/webhook

# 9. Deploy Sui Move contract (testnet)
cd apps/contracts
sui client publish --gas-budget 100000000
# Copy PackageID → REGISTRY_PACKAGE_ID in .env
# Copy SharedObject ID from publish output → REGISTRY_OBJECT_ID in .env
```
