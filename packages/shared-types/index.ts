// ─── Enums ───────────────────────────────────────────────────────────────────

export enum FindingSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export enum FindingCategory {
  ACCESS_CONTROL = 'ACCESS_CONTROL',
  INTEGER_OVERFLOW = 'INTEGER_OVERFLOW',
  REENTRANCY = 'REENTRANCY',
  UNCHECKED_RETURN = 'UNCHECKED_RETURN',
  OBJECT_CONFUSION = 'OBJECT_CONFUSION',
  CAPABILITY_MISUSE = 'CAPABILITY_MISUSE',
  DOS = 'DOS',
  LOGIC_ERROR = 'LOGIC_ERROR',
  GAS_ABUSE = 'GAS_ABUSE',
  FLASH_LOAN = 'FLASH_LOAN',
  SHARED_OBJECT_RACE = 'SHARED_OBJECT_RACE',
  FRIEND_MODULE_ABUSE = 'FRIEND_MODULE_ABUSE',
  MISSING_VALIDATION = 'MISSING_VALIDATION',
  OTHER = 'OTHER',
}

export enum AuditStatus {
  QUEUED = 'QUEUED',
  ANALYZING = 'ANALYZING',
  STORING = 'STORING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
}

export enum RiskLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  CLEAN = 'CLEAN',
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface AuditFinding {
  id: string;
  title: string;
  severity: FindingSeverity;
  category: FindingCategory;
  location: {
    module: string;
    function: string | null;
    lineHint: string;
  };
  description: string;
  impact: string;
  recommendation: string;
  codeSnippet: string | null;
  attackVector?: string;
  refinedRecommendation?: string;
}

export interface AuditSummary {
  contractName: string;
  moduleCount: number;
  lineCount: number;
  overallRisk: RiskLevel;
  auditedAt: string;
  executiveSummary: string;
}

export interface GasAnalysis {
  expensivePatterns: string[];
  optimizationSuggestions: string[];
}

export interface AuditResult {
  summary: AuditSummary;
  findings: AuditFinding[];
  gasAnalysis: GasAnalysis;
  overallRecommendations: string[];
}

// ─── Event Interfaces ────────────────────────────────────────────────────────

export interface ProgressEvent {
  step: string;
  pct: number;
  message: string;
}

export interface AuditCompleteEvent {
  blobId: string;
  walrusUrl: string;
  auditId: string;
}
