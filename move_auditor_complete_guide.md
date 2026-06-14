# AI Move Contract Auditor — Complete Build Guide
### Sui Overflow 2026 | Full Workflow + File Structure

---

## 1. PROJECT OVERVIEW

**What it does in one sentence:** Paste a Sui Move smart contract → Claude API runs a structured security audit → report is stored permanently on Walrus → you get a shareable `https://aggregator.walrus-testnet.walrus.space/v1/<blobId>` URL in under 60 seconds.

**Tech stack decision:**
| Layer | Choice | Why |
|---|---|---|
| Backend | NestJS (TypeScript) | Your existing skillset; DI makes Claude + Walrus services cleanly injectable |
| Frontend | Next.js 14 (App Router) | SSR for report pages; same TypeScript codebase |
| AI Engine | Claude API (`claude-sonnet-4-20250514`) | Best code analysis at token-efficient price |
| Storage | Walrus Testnet (HTTP Publisher) | Permanent tamper-proof blobs; 2,200-request TS SDK problem avoided |
| Database | PostgreSQL + Prisma | Audit history, user tracking, shareable slugs |
| Queue | BullMQ + Redis | Async audit processing; prevents API timeout on long contracts |
| Auth | JWT + optional Sui wallet signature | Lightweight; wallet sig gives Web3 cred for demo |

---

## 2. SYSTEM ARCHITECTURE

```
User Browser
    │
    ▼
┌─────────────────────────────────────────┐
│           Next.js Frontend              │
│  /app                                   │
│  ├── page.tsx (paste contract)          │
│  ├── audit/[id]/page.tsx (live status)  │
│  └── report/[blobId]/page.tsx (results) │
└─────────────────┬───────────────────────┘
                  │ REST + SSE
                  ▼
┌─────────────────────────────────────────┐
│           NestJS Backend API            │
│  POST /audit/submit                     │
│  GET  /audit/:id/status  (SSE stream)   │
│  GET  /audit/:id/report                 │
│  GET  /reports (history)                │
└────┬───────────────┬────────────────────┘
     │               │
     ▼               ▼
┌─────────┐    ┌─────────────────────────┐
│  BullMQ │    │     PostgreSQL           │
│  Queue  │    │  (audit jobs, reports,   │
│  +Redis │    │   user sessions)         │
└────┬────┘    └─────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│         Audit Worker (BullMQ)           │
│  1. Validate Move syntax                │
│  2. Call Claude API (structured prompt) │
│  3. Parse + score findings              │
│  4. Render HTML report                  │
│  5. PUT blob → Walrus Publisher         │
│  6. Save blobId → Postgres              │
│  7. Emit SSE "complete" event           │
└──────────────┬──────────────────────────┘
               │
     ┌─────────┴──────────┐
     ▼                    ▼
┌──────────┐    ┌──────────────────────────┐
│ Claude   │    │ Walrus Testnet Publisher  │
│ API      │    │ https://publisher-devnet  │
│ Sonnet 4 │    │ .walrus.space             │
└──────────┘    └──────────────────────────┘
```

---

## 3. DETAILED WORKFLOW (Step by Step)

### Step 1 — Contract Submission
```
User pastes Move contract on frontend
→ Frontend calls POST /api/audit/submit
  Body: { contractCode: string, contractName: string, description?: string }
→ Backend validates: non-empty, under 50KB, basic Move syntax check (has "module" keyword)
→ Backend creates Audit record in Postgres with status="queued"
→ Backend adds job to BullMQ queue
→ Backend returns { auditId: "uuid", statusUrl: "/audit/uuid/status" }
→ Frontend redirects to /audit/[auditId] (live progress page)
```

### Step 2 — Live Progress via SSE
```
Frontend connects to GET /audit/:id/status (Server-Sent Events)
→ Backend streams status updates:
  { event: "progress", data: { step: "analyzing", pct: 20, message: "Scanning access controls..." } }
  { event: "progress", data: { step: "storing", pct: 85, message: "Uploading to Walrus..." } }
  { event: "complete", data: { blobId: "abc123", reportUrl: "/report/abc123" } }
→ Frontend shows animated step-by-step progress UI
→ On "complete" event → frontend auto-redirects to /report/[blobId]
```

### Step 3 — Audit Worker Processing
```
BullMQ picks up job
│
├── PHASE 1: Pre-processing (2 sec)
│   ├── Extract module names, function signatures, struct definitions
│   ├── Count lines, estimate complexity
│   └── Emit progress: 10%
│
├── PHASE 2: Claude API Call (20-40 sec)
│   ├── Build structured prompt (see Section 5)
│   ├── POST to api.anthropic.com/v1/messages
│   ├── Model: claude-sonnet-4-20250514, max_tokens: 4096
│   ├── Parse XML-structured response into finding objects
│   └── Emit progress: 70%
│
├── PHASE 3: Report Generation (2 sec)
│   ├── Score overall risk (Critical/High/Medium/Low/Info counts)
│   ├── Generate HTML report from template
│   ├── Include: summary, findings table, per-finding detail, remediation
│   └── Emit progress: 80%
│
├── PHASE 4: Walrus Storage (5-10 sec)
│   ├── PUT request to https://publisher-devnet.walrus.space/v1/blobs
│   │   Headers: Content-Type: text/html
│   │   Query: ?epochs=5 (store for 5 epochs ≈ sustained availability)
│   │   Body: rendered HTML report string
│   ├── Parse response: { "newlyCreated": { "blobObject": { "id": "0x..." } } }
│   │   OR: { "alreadyCertified": { "blobId": "..." } }
│   ├── Extract blobId
│   └── Emit progress: 95%
│
└── PHASE 5: Finalization (1 sec)
    ├── Save to Postgres: { auditId, blobId, findings JSON, scores, walrusUrl }
    ├── Update audit status = "complete"
    ├── Emit SSE: { event: "complete", blobId, reportUrl }
    └── Done
```

### Step 4 — Report Display
```
User lands on /report/[blobId]
→ Next.js fetches report from Postgres by blobId (fast, cached)
→ Renders: Risk score badge, findings table, per-finding detail cards
→ "View on Walrus" button links to:
  https://aggregator.walrus-testnet.walrus.space/v1/<blobId>
→ "Share Report" generates shareable URL
→ "Copy Walrus URL" for permanent tamper-proof link
```

---

## 4. FILE STRUCTURE

```
move-auditor/
│
├── apps/
│   ├── api/                          # NestJS Backend
│   │   ├── src/
│   │   │   ├── main.ts               # Bootstrap, global pipes, CORS
│   │   │   ├── app.module.ts         # Root module, imports all feature modules
│   │   │   │
│   │   │   ├── modules/
│   │   │   │   │
│   │   │   │   ├── audit/            # Core audit feature module
│   │   │   │   │   ├── audit.module.ts
│   │   │   │   │   ├── audit.controller.ts      # POST /audit/submit, GET /audit/:id/status
│   │   │   │   │   ├── audit.service.ts         # Orchestrates submit → queue → response
│   │   │   │   │   ├── audit.repository.ts      # Postgres queries via Prisma
│   │   │   │   │   ├── audit.processor.ts       # BullMQ worker (the main pipeline)
│   │   │   │   │   ├── audit.gateway.ts         # SSE streaming (EventEmitter-based)
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── submit-audit.dto.ts  # Validation: contractCode, contractName
│   │   │   │   │       └── audit-response.dto.ts
│   │   │   │   │
│   │   │   │   ├── claude/           # Claude API integration
│   │   │   │   │   ├── claude.module.ts
│   │   │   │   │   ├── claude.service.ts        # Calls Anthropic API, parses response
│   │   │   │   │   ├── prompts/
│   │   │   │   │   │   ├── system-prompt.ts     # The audit system prompt (critical!)
│   │   │   │   │   │   └── user-prompt.builder.ts  # Builds per-contract user message
│   │   │   │   │   └── types/
│   │   │   │   │       └── finding.types.ts     # AuditFinding, Severity, FindingCategory
│   │   │   │   │
│   │   │   │   ├── walrus/           # Walrus storage integration
│   │   │   │   │   ├── walrus.module.ts
│   │   │   │   │   ├── walrus.service.ts        # PUT blob, GET blob, parse blobId
│   │   │   │   │   └── walrus.config.ts         # Publisher URL, epochs, timeout config
│   │   │   │   │
│   │   │   │   ├── report/           # Report rendering
│   │   │   │   │   ├── report.module.ts
│   │   │   │   │   ├── report.service.ts        # GET /reports, GET /reports/:id
│   │   │   │   │   ├── report.controller.ts
│   │   │   │   │   └── templates/
│   │   │   │   │       └── audit-report.template.ts  # HTML template generator
│   │   │   │   │
│   │   │   │   └── health/           # Health check endpoint
│   │   │   │       └── health.controller.ts
│   │   │   │
│   │   │   ├── common/               # Cross-cutting concerns
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   └── logging.interceptor.ts
│   │   │   │   ├── pipes/
│   │   │   │   │   └── move-validation.pipe.ts  # Basic Move syntax check
│   │   │   │   └── constants/
│   │   │   │       └── queue.constants.ts       # AUDIT_QUEUE, job names
│   │   │   │
│   │   │   └── config/
│   │   │       ├── app.config.ts
│   │   │       ├── database.config.ts
│   │   │       └── redis.config.ts
│   │   │
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Audit, Report, Finding models
│   │   │   └── migrations/
│   │   │
│   │   ├── test/
│   │   │   ├── audit.e2e.spec.ts
│   │   │   └── claude.service.spec.ts
│   │   │
│   │   ├── .env.example
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── web/                          # Next.js Frontend
│       ├── app/
│       │   ├── layout.tsx            # Root layout, fonts, global styles
│       │   ├── page.tsx              # Landing + contract paste UI
│       │   ├── audit/
│       │   │   └── [id]/
│       │   │       └── page.tsx      # Live progress page (SSE consumer)
│       │   └── report/
│       │       └── [blobId]/
│       │           └── page.tsx      # Audit report display
│       │
│       ├── components/
│       │   ├── ContractEditor.tsx    # Monaco editor (code syntax highlight)
│       │   ├── AuditProgress.tsx     # Animated step tracker
│       │   ├── ReportViewer.tsx      # Full report render
│       │   ├── FindingCard.tsx       # Individual finding display
│       │   ├── RiskBadge.tsx         # Critical/High/Medium/Low badges
│       │   ├── SeverityChart.tsx     # Bar chart of findings by severity
│       │   └── WalrusLink.tsx        # Permanent Walrus URL display + copy
│       │
│       ├── lib/
│       │   ├── api.ts                # API client (axios or fetch wrappers)
│       │   └── sse.ts                # SSE hook (useAuditProgress)
│       │
│       ├── types/
│       │   └── audit.types.ts        # Shared types (matches backend DTOs)
│       │
│       ├── public/
│       │   └── sui-logo.svg
│       │
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── package.json
│
├── packages/                         # Shared code (monorepo)
│   └── shared-types/
│       ├── index.ts                  # AuditStatus, FindingSeverity, AuditReport types
│       └── package.json
│
├── docker/
│   ├── docker-compose.yml            # postgres + redis for local dev
│   └── docker-compose.prod.yml
│
├── .env.example
├── turbo.json                        # Turborepo config (runs api + web together)
└── package.json                      # Root workspace
```

---

## 5. THE CLAUDE SYSTEM PROMPT (Most Important File)

This is `apps/api/src/modules/claude/prompts/system-prompt.ts`. Get this right before anything else.

```typescript
export const MOVE_AUDIT_SYSTEM_PROMPT = `
You are a senior Move smart contract security auditor specializing in Sui Move contracts.
Your expertise matches that of OtterSec, Zellic, and SlowMist auditors.

You will receive a Sui Move smart contract and must perform a complete security audit.

## YOUR OUTPUT FORMAT

Respond ONLY with a valid JSON object matching this exact schema.
No markdown, no preamble, no explanation outside the JSON.

{
  "summary": {
    "contractName": "string",
    "moduleCount": number,
    "lineCount": number,
    "overallRisk": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "CLEAN",
    "auditedAt": "ISO8601 string",
    "executiveSummary": "2-3 sentence plain English summary"
  },
  "findings": [
    {
      "id": "F-001",
      "title": "string (short, specific)",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
      "category": "ACCESS_CONTROL" | "INTEGER_OVERFLOW" | "REENTRANCY" | "UNCHECKED_RETURN" | "OBJECT_CONFUSION" | "CAPABILITY_MISUSE" | "DOS" | "LOGIC_ERROR" | "GAS_ABUSE" | "FLASH_LOAN" | "SHARED_OBJECT_RACE" | "FRIEND_MODULE_ABUSE" | "MISSING_VALIDATION" | "OTHER",
      "location": {
        "module": "string",
        "function": "string or null",
        "lineHint": "string describing where (e.g. 'withdraw function, line ~45')"
      },
      "description": "string (2-4 sentences: what is the vulnerability, why it exists)",
      "impact": "string (what an attacker can do if exploited)",
      "recommendation": "string (specific fix, ideally with pseudocode or pattern)",
      "codeSnippet": "string | null (the vulnerable code, if identifiable, max 10 lines)"
    }
  ],
  "gasAnalysis": {
    "expensivePatterns": ["string"],
    "optimizationSuggestions": ["string"]
  },
  "overallRecommendations": ["string (top 3-5 actionable items)"]
}

## VULNERABILITY CHECKLIST

For every contract, check ALL of the following. These are the exact categories
that real Move audits check, sourced from SlowMist, Hacken, and OtterSec methodologies:

### CRITICAL CHECKS (check these first)
1. ACCESS CONTROL: Does every state-changing function verify the caller's identity?
   - Missing: object::owner(&obj) == tx_context::sender(ctx) check
   - Missing: Capability (Cap) struct verification before privileged operations
   - Public functions that should be entry-only or friend-only
   
2. OBJECT CONFUSION: Are objects validated before use?
   - Can an attacker pass a different object of the same type to a function?
   - Are shared objects properly version-checked?
   
3. CAPABILITY MISUSE: Are admin capabilities (AdminCap, TreasuryCap) properly guarded?
   - Can capabilities be transferred to untrusted addresses?
   - Are one-time witness (OTW) patterns followed correctly?

### HIGH CHECKS
4. INTEGER ARITHMETIC: Any overflow/underflow risk?
   - Sui Move has no automatic overflow protection for u64/u128 arithmetic
   - Check: balances, prices, shares, reward calculations
   
5. UNCHECKED RETURN VALUES: Are Option<T> and Result types unwrapped safely?
   - option::unwrap() on potentially None values = panic
   - Missing assert!() on critical operations
   
6. SHARED OBJECT RACES: Shared objects can be accessed by anyone
   - Is there state that multiple concurrent transactions can race on?
   - Missing version checks on shared object mutations

### MEDIUM CHECKS
7. REENTRANCY: Move discourages reentrancy but dynamic dispatch can enable it
   - Callbacks into unknown modules mid-state-change
   
8. FRIEND MODULE ABUSE: friend declarations expand trust surface
   - Does any friend module get more access than necessary?
   
9. DOS VULNERABILITIES:
   - Unbounded loops over user-controlled vectors
   - Operations that grow gas cost proportionally to attacker-controlled input
   
10. FLASH LOAN: Economic logic assuming atomicity that can be broken
    - Price oracles readable within a transaction
    - Balance checks that don't account for flash loan vector

### LOW / INFO CHECKS
11. Missing events on critical state changes
12. Lack of pause/emergency stop mechanism
13. Hardcoded addresses or magic numbers
14. Dead code / unreachable functions
15. Gas inefficiencies (unnecessary copies, re-reads of fields)

## SEVERITY RATING GUIDE

CRITICAL: Funds can be stolen or contract can be permanently bricked
HIGH: Significant loss of funds possible under specific conditions, or major logic bypass
MEDIUM: Protocol integrity compromised but funds not immediately at risk
LOW: Best practice violations, potential edge-case issues
INFO: Code quality, optimization, or documentation issues

## IMPORTANT RULES
- If you see NO findings of a category, do not fabricate findings
- A "CLEAN" overallRisk is valid if the contract is genuinely well-written
- Be specific: name the exact function and what property is violated
- Do not give generic advice; every finding must reference the actual code
- If the contract is extremely simple (< 20 lines), say so in executiveSummary
`;
```

---

## 6. KEY SERVICE IMPLEMENTATIONS

### `walrus.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WalrusService {
  private readonly logger = new Logger(WalrusService.name);

  // Testnet publisher — for mainnet you must run your own authenticated publisher
  private readonly PUBLISHER_URL =
    process.env.WALRUS_PUBLISHER_URL ||
    'https://publisher-devnet.walrus.space';
  private readonly AGGREGATOR_URL =
    process.env.WALRUS_AGGREGATOR_URL ||
    'https://aggregator-devnet.walrus.space';

  async storeReport(htmlContent: string, epochs = 5): Promise<string> {
    try {
      const response = await axios.put(
        `${this.PUBLISHER_URL}/v1/blobs?epochs=${epochs}`,
        htmlContent,
        {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          timeout: 30_000, // 30 second timeout
          maxBodyLength: 10 * 1024 * 1024, // 10MB max
        },
      );

      const data = response.data;

      // Walrus returns either "newlyCreated" or "alreadyCertified"
      const blobId =
        data?.newlyCreated?.blobObject?.id ||
        data?.alreadyCertified?.blobId;

      if (!blobId) {
        throw new Error(`Unexpected Walrus response: ${JSON.stringify(data)}`);
      }

      this.logger.log(`Stored report on Walrus: ${blobId}`);
      return blobId;
    } catch (error) {
      this.logger.error('Failed to store on Walrus', error);
      throw error;
    }
  }

  getReportUrl(blobId: string): string {
    return `${this.AGGREGATOR_URL}/v1/${blobId}`;
  }
}
```

### `audit.processor.ts` (BullMQ Worker)

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AUDIT_QUEUE } from '../../common/constants/queue.constants';
import { ClaudeService } from '../claude/claude.service';
import { WalrusService } from '../walrus/walrus.service';
import { ReportService } from '../report/report.service';
import { AuditRepository } from './audit.repository';
import { AuditGateway } from './audit.gateway';

@Processor(AUDIT_QUEUE)
export class AuditProcessor extends WorkerHost {
  constructor(
    private readonly claudeService: ClaudeService,
    private readonly walrusService: WalrusService,
    private readonly reportService: ReportService,
    private readonly auditRepository: AuditRepository,
    private readonly auditGateway: AuditGateway,
  ) {
    super();
  }

  async process(job: Job) {
    const { auditId, contractCode, contractName } = job.data;

    try {
      // Phase 1: Update status + emit progress
      await this.auditRepository.updateStatus(auditId, 'ANALYZING');
      this.auditGateway.emitProgress(auditId, 10, 'Parsing contract structure...');

      // Phase 2: Run Claude audit
      this.auditGateway.emitProgress(auditId, 20, 'Running security analysis...');
      const auditResult = await this.claudeService.auditContract(
        contractCode,
        contractName,
        (pct, msg) => this.auditGateway.emitProgress(auditId, pct, msg),
      );

      // Phase 3: Generate HTML report
      this.auditGateway.emitProgress(auditId, 75, 'Generating report...');
      const htmlReport = this.reportService.generateHtml(auditResult, contractName);

      // Phase 4: Store on Walrus
      this.auditGateway.emitProgress(auditId, 85, 'Uploading to Walrus network...');
      const blobId = await this.walrusService.storeReport(htmlReport);
      const walrusUrl = this.walrusService.getReportUrl(blobId);

      // Phase 5: Save to DB
      await this.auditRepository.saveResult(auditId, {
        blobId,
        walrusUrl,
        findings: auditResult.findings,
        overallRisk: auditResult.summary.overallRisk,
        status: 'COMPLETE',
      });

      // Phase 6: Emit completion
      this.auditGateway.emitComplete(auditId, blobId, walrusUrl);

    } catch (error) {
      await this.auditRepository.updateStatus(auditId, 'FAILED');
      this.auditGateway.emitError(auditId, error.message);
      throw error; // BullMQ will handle retry
    }
  }
}
```

### `claude.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { MOVE_AUDIT_SYSTEM_PROMPT } from './prompts/system-prompt';
import { buildUserPrompt } from './prompts/user-prompt.builder';
import { AuditResult } from './types/finding.types';

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  async auditContract(
    contractCode: string,
    contractName: string,
    onProgress?: (pct: number, msg: string) => void,
  ): Promise<AuditResult> {
    onProgress?.(25, 'Connecting to Claude API...');

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: MOVE_AUDIT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(contractCode, contractName),
        },
      ],
    });

    onProgress?.(65, 'Parsing audit findings...');

    const rawText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('');

    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/```json\n?|```\n?/g, '').trim();

    let result: AuditResult;
    try {
      result = JSON.parse(cleaned);
    } catch (e) {
      this.logger.error('Failed to parse Claude response as JSON', rawText);
      throw new Error('Audit engine returned unparseable response');
    }

    // Validate minimum shape
    if (!result.summary || !Array.isArray(result.findings)) {
      throw new Error('Audit result missing required fields');
    }

    return result;
  }
}
```

---

## 7. DATABASE SCHEMA (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Audit {
  id            String   @id @default(uuid())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  contractName  String
  contractCode  String   @db.Text      // store original for re-audit
  status        AuditStatus @default(QUEUED)

  // Populated on completion
  blobId        String?  @unique
  walrusUrl     String?
  overallRisk   RiskLevel?
  findingsJson  Json?    // full findings array
  summaryJson   Json?    // summary block

  // Derived stats (for quick listing)
  criticalCount Int      @default(0)
  highCount     Int      @default(0)
  mediumCount   Int      @default(0)
  lowCount      Int      @default(0)
  infoCount     Int      @default(0)

  errorMessage  String?

  @@index([status])
  @@index([createdAt])
}

enum AuditStatus {
  QUEUED
  ANALYZING
  STORING
  COMPLETE
  FAILED
}

enum RiskLevel {
  CRITICAL
  HIGH
  MEDIUM
  LOW
  CLEAN
}
```

---

## 8. ENVIRONMENT VARIABLES

```bash
# apps/api/.env.example

# App
PORT=3001
NODE_ENV=development

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Walrus (Testnet)
WALRUS_PUBLISHER_URL=https://publisher-devnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator-devnet.walrus.space
WALRUS_EPOCHS=5

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/move_auditor

# Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS
FRONTEND_URL=http://localhost:3000

# Rate limiting (protect Claude API costs)
MAX_AUDITS_PER_HOUR=20
MAX_CONTRACT_SIZE_KB=50
```

```bash
# apps/web/.env.example
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 9. FRONTEND — KEY COMPONENT SPECS

### `ContractEditor.tsx`
- Monaco Editor instance with Move language syntax highlight
- Built-in example contracts (one clean, one with 3 bugs) for demo
- Character counter + "50KB max" warning
- Submit button disables on empty / oversized input

### `AuditProgress.tsx` (SSE consumer)
```
Steps shown with animated states:
  ✓ Submitted          [instant]
  ⟳ Parsing contract   [~2s]
  ⟳ Running AI audit   [~20-40s]  ← most time spent here
  ⟳ Scoring findings   [~2s]
  ⟳ Uploading to Walrus [~5s]
  ✓ Complete
```
Connect to `/audit/:id/status` as EventSource.
On `complete` event → show "View Report" button + auto-redirect after 2s.

### `ReportViewer.tsx`
- Top: Contract name, overall risk badge (color-coded), audit date
- Summary box: Executive summary text
- Findings count bar: red | orange | yellow | blue | gray chips
- Findings table: sortable by severity, filterable by category
- Per-finding accordion: title, severity, location, description, impact, fix, code snippet
- Bottom: Walrus permanence section with blob URL, copy button, QR code (optional)

---

## 10. BUILD ORDER (What to Build First)

Build in this exact sequence. Each phase is independently testable.

```
WEEK 1: Backend Core
─────────────────────
Day 1-2: Project setup
  ✓ nest new api (or turborepo init)
  ✓ Install deps: @nestjs/bullmq, bullmq, prisma, @prisma/client, @anthropic-ai/sdk, axios
  ✓ Docker compose: postgres + redis
  ✓ Prisma schema + migration
  ✓ .env setup

Day 3: Claude Integration (THE KEY PART)
  ✓ Write system-prompt.ts (use template in Section 5)
  ✓ claude.service.ts - call API, parse JSON response
  ✓ Test with: curl -X POST with sample contracts
  ✓ Test with: a clean contract (should return CLEAN)
  ✓ Test with: a contract with obvious bug (should catch it)

Day 4: Walrus Integration
  ✓ walrus.service.ts - PUT blob, parse blobId
  ✓ Test: curl the testnet publisher directly first
  ✓ Verify: blob is readable at aggregator URL

Day 5: Queue + Worker
  ✓ BullMQ queue setup
  ✓ audit.processor.ts - connects Claude + Walrus pipeline
  ✓ SSE gateway for progress streaming
  ✓ End-to-end test: submit → queue → audit → walrus → done

WEEK 2: API + Frontend
─────────────────────
Day 6-7: REST API
  ✓ POST /audit/submit controller
  ✓ GET /audit/:id/status (SSE)
  ✓ GET /audit/:id/report
  ✓ GET /reports (history list)

Day 8-9: Next.js Frontend
  ✓ Landing page + Monaco editor
  ✓ Progress page (SSE consumer)
  ✓ Report viewer

Day 10: Polish
  ✓ Pre-loaded demo contracts
  ✓ Error states + loading states
  ✓ Mobile responsive
  ✓ Rate limiting + basic security

DEMO DAY PREP
──────────────
  ✓ Two example contracts ready:
    - examples/vulnerable_defi.move (has 3 bugs: missing ownership check, unchecked u64 math, shared object race)
    - examples/clean_nft.move (should return CLEAN or INFO-only)
  ✓ Practice the 4-minute demo script:
    1. "Developers can't afford $30K audits" (30s)
    2. Paste vulnerable_defi.move → live audit → findings appear (90s)
    3. Show Walrus URL: permanent, tamper-proof (30s)
    4. Paste clean_nft.move → CLEAN result (30s)
    5. "Every Sui launch can now ship with an audit report" (30s)
```

---

## 11. DEMO CONTRACTS (Ready to Use)

### `examples/vulnerable_defi.move` — use this for the live demo

```move
module defi::vault {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;

    struct Vault has key {
        id: UID,
        balance: u64,
        owner: address,
    }

    struct AdminCap has key, store {
        id: UID,
    }

    // BUG 1: Missing ownership check — anyone can call withdraw
    public entry fun withdraw(
        vault: &mut Vault,
        amount: u64,
        ctx: &mut TxContext
    ) {
        // Should check: assert!(vault.owner == tx_context::sender(ctx), 0);
        vault.balance = vault.balance - amount;
    }

    // BUG 2: Integer overflow — no bounds check on deposit
    public entry fun deposit(vault: &mut Vault, amount: u64) {
        vault.balance = vault.balance + amount; // can overflow u64
    }

    // BUG 3: AdminCap can be transferred arbitrarily — no transfer restriction
    public entry fun transfer_admin(cap: AdminCap, recipient: address) {
        transfer::public_transfer(cap, recipient);
    }
}
```

### `examples/clean_nft.move` — use this to show CLEAN result

```move
module nft::collectible {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;

    struct NFT has key, store {
        id: UID,
        name: vector<u8>,
        creator: address,
    }

    struct MintEvent has copy, drop {
        nft_id: address,
        creator: address,
    }

    public entry fun mint(
        name: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let nft = NFT {
            id: object::new(ctx),
            name,
            creator: sender,
        };
        event::emit(MintEvent {
            nft_id: object::id_address(&nft),
            creator: sender,
        });
        transfer::public_transfer(nft, sender);
    }
}
```

---

## 12. DEPENDENCIES LIST

### Backend (`apps/api/package.json`)
```json
{
  "dependencies": {
    "@nestjs/common": "^10.x",
    "@nestjs/core": "^10.x",
    "@nestjs/platform-express": "^10.x",
    "@nestjs/bullmq": "^10.x",
    "@nestjs/config": "^3.x",
    "@anthropic-ai/sdk": "^0.30.x",
    "@prisma/client": "^5.x",
    "bullmq": "^5.x",
    "axios": "^1.x",
    "ioredis": "^5.x",
    "class-validator": "^0.14.x",
    "class-transformer": "^0.5.x"
  },
  "devDependencies": {
    "prisma": "^5.x",
    "@nestjs/testing": "^10.x",
    "typescript": "^5.x"
  }
}
```

### Frontend (`apps/web/package.json`)
```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "@monaco-editor/react": "^4.x",
    "recharts": "^2.x",
    "tailwindcss": "^3.x",
    "lucide-react": "^0.383.x"
  }
}
```

---

## 13. WALRUS MAINNET NOTE

For the hackathon (Testnet), the public publisher at
`https://publisher-devnet.walrus.space` works without any wallet or WAL tokens.

For production/Mainnet:
- Walrus Mainnet has no public unauthenticated publisher
- You must run your own publisher (requires a funded Sui wallet with WAL tokens)
- OR use the Upload Relay with the TypeScript SDK
- The aggregator for reading blobs IS public on both networks

This is fine for the demo — Testnet blobs persist for the hackathon timeframe.

---

## 14. WHAT MAKES THIS WIN

**Technical credibility signals for judges:**
- Structured JSON output from Claude (not raw text slapped in a page)
- Proper severity taxonomy matching real audit firms (CRITICAL/HIGH/MEDIUM/LOW/INFO)
- Category codes (`ACCESS_CONTROL`, `INTEGER_OVERFLOW`, etc.) matching SlowMist taxonomy
- Walrus `blobId` in the response (shows you actually stored it, didn't fake a URL)
- BullMQ async queue (shows production-grade thinking, not just a sync API call)
- The CLEAN result on good contracts (shows the tool isn't crying wolf)

**Business case in one line for OtterSec/OpenZeppelin judges:**
*"Every Sui project that can't afford your firm can now ship with an AI pre-audit — and when they can afford you, they come in already knowing what's wrong."*
It's a referral funnel for them, not competition.
