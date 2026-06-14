// ─── Queue Names ─────────────────────────────────────────────────────────────

export const AUDIT_QUEUE = 'audit-queue';
export const REPO_AUDIT_QUEUE = 'repo-audit-queue';

// ─── Job Names ────────────────────────────────────────────────────────────────

export const AUDIT_JOB_NAMES = {
  PROCESS_CONTRACT: 'process-contract',
} as const;

// ─── Queue Configuration ─────────────────────────────────────────────────────

export const QUEUE_CONFIG = {
  defaultJobOptions: {
    /** Retry up to 3 times on failure */
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      /** Wait 5s, then 10s, then 20s between retries */
      delay: 5_000,
    },
    /** Keep the last 100 completed jobs in Redis for debugging */
    removeOnComplete: 100,
    /** Keep the last 50 failed jobs */
    removeOnFail: 50,
  },
} as const;
