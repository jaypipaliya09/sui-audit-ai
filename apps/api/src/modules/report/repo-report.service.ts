import { Injectable } from '@nestjs/common';

@Injectable()
export class RepoReportService {
  generateConsolidatedHtml(data: {
    repoOwner: string;
    repoName: string;
    commitSha: string;
    projectTrack: string;
    auditResults: { fileName: string; findings: any[]; summary: any; result: any }[];
    crossContractAnalysis: any;
  }): string {
    const { repoOwner, repoName, commitSha, projectTrack, auditResults, crossContractAnalysis } = data;
    const auditDate = new Date().toISOString().split('T')[0];

    const allFindings = auditResults.flatMap((r) => r.findings);
    const totalFindings = allFindings.length;
    const criticalCount = allFindings.filter((f) => f.severity === 'CRITICAL').length;
    const highCount = allFindings.filter((f) => f.severity === 'HIGH').length;
    const mediumCount = allFindings.filter((f) => f.severity === 'MEDIUM').length;
    const lowCount = allFindings.filter((f) => f.severity === 'LOW').length;
    const infoCount = allFindings.filter((f) => f.severity === 'INFO').length;

    const riskBadge = this.getRiskBadge(crossContractAnalysis.repositoryRisk || 'MEDIUM');

    const contractSections = auditResults.map((r) => {
      const risk = r.summary?.overallRisk || 'UNKNOWN';
      const findings = (r.findings || []).map((f: any) => `
        <div class="finding finding-${(f.severity || 'INFO').toLowerCase()}">
          <div class="finding-header">
            <span class="severity-badge ${(f.severity || 'INFO').toLowerCase()}">${f.severity || 'INFO'}</span>
            <strong>${this.escapeHtml(f.title || 'Untitled')}</strong>
          </div>
          <p>${this.escapeHtml(f.description || '')}</p>
          ${f.recommendation ? `<p class="recommendation"><strong>Recommendation:</strong> ${this.escapeHtml(f.recommendation)}</p>` : ''}
        </div>
      `).join('');

      return `
        <details class="contract-section">
          <summary>
            <span class="severity-badge ${risk.toLowerCase()}">${risk}</span>
            <strong>${this.escapeHtml(r.fileName)}</strong>
            <span class="finding-count">${r.findings.length} findings</span>
          </summary>
          <div class="contract-findings">
            ${findings || '<p>No findings for this contract.</p>'}
          </div>
        </details>
      `;
    }).join('');

    const sharedRisks = (crossContractAnalysis.sharedRisks || []).map((r: any) => `
      <div class="shared-risk">
        <span class="severity-badge ${(r.severity || 'MEDIUM').toLowerCase()}">${r.severity || 'MEDIUM'}</span>
        <strong>${this.escapeHtml(r.title || '')}</strong>
        <p>${this.escapeHtml(r.description || '')}</p>
        <p class="affected">Affected: ${(r.affectedContracts || []).join(', ')}</p>
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MoveAuditor — ${repoOwner}/${repoName} Audit Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; background: #0a0a0f; color: #e0e0e0; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; padding: 2rem; }
    .header { text-align: center; margin-bottom: 2rem; padding: 2rem; background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 12px; border: 1px solid #2d2d44; }
    .header h1 { font-size: 1.8rem; color: #fff; margin-bottom: 0.5rem; }
    .header .meta { color: #888; font-size: 0.9rem; }
    .risk-badge { display: inline-block; padding: 0.3rem 1rem; border-radius: 20px; font-weight: 700; font-size: 1.1rem; margin: 0.5rem 0; }
    .risk-badge.critical { background: #ff4444; color: #fff; }
    .risk-badge.high { background: #ff8800; color: #fff; }
    .risk-badge.medium { background: #ffcc00; color: #000; }
    .risk-badge.low { background: #44bb44; color: #fff; }
    .risk-badge.clean { background: #22cc88; color: #fff; }
    .severity-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-right: 8px; }
    .severity-badge.critical { background: #ff4444; color: #fff; }
    .severity-badge.high { background: #ff8800; color: #fff; }
    .severity-badge.medium { background: #ffcc00; color: #000; }
    .severity-badge.low { background: #44bb44; color: #fff; }
    .severity-badge.info { background: #4488ff; color: #fff; }
    .severity-badge.unknown { background: #666; color: #fff; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .stat { text-align: center; padding: 1rem; background: #1a1a2e; border-radius: 8px; border: 1px solid #2d2d44; }
    .stat .count { font-size: 2rem; font-weight: 700; }
    .stat .label { font-size: 0.8rem; color: #888; }
    .stat .count.critical { color: #ff4444; }
    .stat .count.high { color: #ff8800; }
    .stat .count.medium { color: #ffcc00; }
    .stat .count.low { color: #44bb44; }
    .stat .count.info { color: #4488ff; }
    section { margin: 2rem 0; }
    section h2 { font-size: 1.3rem; color: #fff; margin-bottom: 1rem; border-bottom: 1px solid #2d2d44; padding-bottom: 0.5rem; }
    .executive-summary { background: #1a1a2e; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #6c63ff; }
    .shared-risk { background: #1a1a2e; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #2d2d44; }
    .affected { font-size: 0.85rem; color: #888; }
    details.contract-section { margin-bottom: 1rem; }
    details.contract-section summary { cursor: pointer; padding: 1rem; background: #1a1a2e; border-radius: 8px; border: 1px solid #2d2d44; list-style: none; display: flex; align-items: center; gap: 8px; }
    details.contract-section summary::-webkit-details-marker { display: none; }
    .finding-count { margin-left: auto; color: #888; font-size: 0.85rem; }
    .contract-findings { padding: 1rem; }
    .finding { background: #12121a; padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid #2d2d44; }
    .finding-header { margin-bottom: 0.5rem; }
    .recommendation { color: #6c63ff; margin-top: 0.5rem; }
    .footer { text-align: center; margin-top: 3rem; padding: 1.5rem; color: #666; font-size: 0.85rem; border-top: 1px solid #2d2d44; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 MoveAuditor — Repository Audit Report</h1>
      <p class="meta">${this.escapeHtml(repoOwner)}/${this.escapeHtml(repoName)} · ${commitSha ? commitSha.substring(0, 7) : 'latest'} · ${projectTrack} · ${auditDate}</p>
      <div class="risk-badge ${(crossContractAnalysis.repositoryRisk || 'medium').toLowerCase()}">${crossContractAnalysis.repositoryRisk || 'MEDIUM'} RISK</div>
    </div>

    <div class="stats">
      <div class="stat"><div class="count">${auditResults.length}</div><div class="label">Contracts</div></div>
      <div class="stat"><div class="count">${totalFindings}</div><div class="label">Total Findings</div></div>
      <div class="stat"><div class="count critical">${criticalCount}</div><div class="label">Critical</div></div>
      <div class="stat"><div class="count high">${highCount}</div><div class="label">High</div></div>
      <div class="stat"><div class="count medium">${mediumCount}</div><div class="label">Medium</div></div>
      <div class="stat"><div class="count low">${lowCount}</div><div class="label">Low</div></div>
      <div class="stat"><div class="count info">${infoCount}</div><div class="label">Info</div></div>
    </div>

    <section>
      <h2>Executive Summary</h2>
      <div class="executive-summary">
        <p>${this.escapeHtml(crossContractAnalysis.executiveSummary || 'No executive summary available.')}</p>
      </div>
    </section>

    ${sharedRisks ? `
    <section>
      <h2>Cross-Contract Risks</h2>
      ${sharedRisks}
    </section>
    ` : ''}

    <section>
      <h2>Per-Contract Findings</h2>
      ${contractSections}
    </section>

    <div class="footer">
      <p>Generated by MoveAuditor · Powered by Claude AI · Stored on Walrus · Verified on Sui</p>
    </div>
  </div>
</body>
</html>`;
  }

  private getRiskBadge(risk: string): string {
    return `<span class="risk-badge ${risk.toLowerCase()}">${risk}</span>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
