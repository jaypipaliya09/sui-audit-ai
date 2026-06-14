import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditRepository } from './audit.repository.js';
import type { AuditFinding, RiskLevel } from '../claude/types/finding.types.js';

export interface AuditDiff {
  fixed: AuditFinding[];
  regressed: AuditFinding[];
  unchanged: AuditFinding[];
  riskChange: 'IMPROVED' | 'REGRESSED' | 'UNCHANGED';
  fixedCount: number;
  regressedCount: number;
}

@Injectable()
export class AuditDiffService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async compareAudits(previousAuditId: string, currentAuditId: string): Promise<AuditDiff> {
    const prevAudit = await this.auditRepository.findByIdOrThrow(previousAuditId);
    const currAudit = await this.auditRepository.findByIdOrThrow(currentAuditId);

    const prevFindings = (prevAudit.findingsJson as any as AuditFinding[]) || [];
    const currFindings = (currAudit.findingsJson as any as AuditFinding[]) || [];

    // Helper to generate a unique key for matching findings
    const getFindingKey = (f: AuditFinding) => `${f.category}:${f.location.module}:${f.location.function}`;

    const prevMap = new Map<string, AuditFinding>();
    prevFindings.forEach(f => prevMap.set(getFindingKey(f), f));

    const currMap = new Map<string, AuditFinding>();
    currFindings.forEach(f => currMap.set(getFindingKey(f), f));

    const fixed: AuditFinding[] = [];
    const regressed: AuditFinding[] = [];
    const unchanged: AuditFinding[] = [];

    // Check what was in prev but is now gone (fixed) or still there (unchanged)
    for (const [key, prevFinding] of prevMap.entries()) {
      const currFinding = currMap.get(key);
      if (currFinding) {
        unchanged.push(currFinding);
      } else {
        fixed.push(prevFinding);
      }
    }

    // Check what is new in curr that wasn't in prev (regressed)
    for (const [key, currFinding] of currMap.entries()) {
      if (!prevMap.has(key)) {
        regressed.push(currFinding);
      }
    }

    const riskOrder: Record<RiskLevel, number> = {
      CLEAN: 0,
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
    };

    const prevRisk = (prevAudit.overallRisk as RiskLevel) || 'MEDIUM';
    const currRisk = (currAudit.overallRisk as RiskLevel) || 'MEDIUM';

    let riskChange: 'IMPROVED' | 'REGRESSED' | 'UNCHANGED' = 'UNCHANGED';
    if (riskOrder[currRisk] < riskOrder[prevRisk]) {
      riskChange = 'IMPROVED';
    } else if (riskOrder[currRisk] > riskOrder[prevRisk]) {
      riskChange = 'REGRESSED';
    }

    return {
      fixed,
      regressed,
      unchanged,
      riskChange,
      fixedCount: fixed.length,
      regressedCount: regressed.length,
    };
  }
}
