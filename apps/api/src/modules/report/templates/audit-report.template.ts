import type {
  AuditResult,
  AuditFinding,
} from '../../claude/types/finding.types.js';

// ─── Severity color mappings ─────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: '#da3633', text: '#ffffff', border: '#f85149' },
  HIGH:     { bg: '#d29922', text: '#ffffff', border: '#e3b341' },
  MEDIUM:   { bg: '#bf8700', text: '#1c1c1c', border: '#d4a72c' },
  LOW:      { bg: '#388bfd', text: '#ffffff', border: '#58a6ff' },
  INFO:     { bg: '#484f58', text: '#ffffff', border: '#6e7681' },
};

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: '#da3633', text: '#ffffff' },
  HIGH:     { bg: '#d29922', text: '#ffffff' },
  MEDIUM:   { bg: '#bf8700', text: '#1c1c1c' },
  LOW:      { bg: '#388bfd', text: '#ffffff' },
  CLEAN:    { bg: '#238636', text: '#ffffff' },
};

// ─── Helper to escape HTML ───────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Render a single finding card ────────────────────────────────────────────

function renderFinding(finding: AuditFinding, index: number): string {
  const sevColor = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.INFO;
  const locationStr = finding.location.function
    ? `${escapeHtml(finding.location.module)}::${escapeHtml(finding.location.function)}`
    : escapeHtml(finding.location.module);

  const codeSnippetHtml = finding.codeSnippet
    ? `<div class="code-snippet">
        <div class="code-label">Vulnerable Code</div>
        <pre><code>${escapeHtml(finding.codeSnippet)}</code></pre>
      </div>`
    : '';

  return `
    <div class="finding-card" id="finding-${index}">
      <div class="finding-header">
        <span class="severity-badge" style="background:${sevColor.bg};color:${sevColor.text};border:1px solid ${sevColor.border}">
          ${escapeHtml(finding.severity)}
        </span>
        <span class="finding-id">${escapeHtml(finding.id)}</span>
        <span class="finding-title">${escapeHtml(finding.title)}</span>
      </div>

      <div class="finding-meta">
        <span class="category-chip">${escapeHtml(finding.category.replace(/_/g, ' '))}</span>
        <span class="location">📍 ${locationStr}</span>
        ${finding.location.lineHint ? `<span class="line-hint">Line: ${escapeHtml(finding.location.lineHint)}</span>` : ''}
      </div>

      <div class="finding-body">
        <div class="section">
          <div class="section-label">📋 Description</div>
          <p>${escapeHtml(finding.description)}</p>
        </div>

        <div class="section">
          <div class="section-label">⚠️ Impact</div>
          <p>${escapeHtml(finding.impact)}</p>
        </div>

        <div class="section">
          <div class="section-label">🔧 Recommendation</div>
          <p>${escapeHtml(finding.recommendation)}</p>
        </div>

        ${codeSnippetHtml}
      </div>
    </div>
  `;
}

// ─── Main template function ──────────────────────────────────────────────────

/**
 * Generate a fully self-contained HTML report from a Claude audit result.
 * No external CSS/JS dependencies — everything is embedded inline.
 *
 * @param result       - The structured AuditResult from Claude
 * @param contractName - Human-readable contract name
 * @returns Complete HTML string ready to be stored on Walrus
 */
export function generateAuditReportHtml(
  result: AuditResult,
  contractName: string,
): string {
  const { summary, findings, gasAnalysis, overallRecommendations } = result;

  const riskColor = RISK_COLORS[summary.overallRisk] || RISK_COLORS.CLEAN;

  // Count findings by severity
  const severityCounts = {
    CRITICAL: findings.filter((f) => f.severity === 'CRITICAL').length,
    HIGH: findings.filter((f) => f.severity === 'HIGH').length,
    MEDIUM: findings.filter((f) => f.severity === 'MEDIUM').length,
    LOW: findings.filter((f) => f.severity === 'LOW').length,
    INFO: findings.filter((f) => f.severity === 'INFO').length,
  };

  const auditDate = summary.auditedAt
    ? new Date(summary.auditedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  // Render findings cards
  const findingsHtml =
    findings.length > 0
      ? findings.map((f, i) => renderFinding(f, i)).join('\n')
      : `<div class="clean-banner">
          <div class="clean-icon">✅</div>
          <div class="clean-title">CLEAN — No Security Issues Found</div>
          <p class="clean-desc">${escapeHtml(summary.executiveSummary)}</p>
        </div>`;

  // Severity count chips
  const severityChipsHtml = Object.entries(severityCounts)
    .map(([sev, count]) => {
      const color = SEVERITY_COLORS[sev] || SEVERITY_COLORS.INFO;
      return `<span class="count-chip" style="background:${color.bg};color:${color.text};border:1px solid ${color.border}">
        ${sev}: ${count}
      </span>`;
    })
    .join('\n');

  // Gas analysis section
  const gasHtml =
    gasAnalysis.expensivePatterns.length > 0 ||
    gasAnalysis.optimizationSuggestions.length > 0
      ? `
    <section class="report-section" id="gas-analysis">
      <h2>⛽ Gas Analysis</h2>
      ${
        gasAnalysis.expensivePatterns.length > 0
          ? `<div class="subsection">
              <h3>Expensive Patterns</h3>
              <ul>${gasAnalysis.expensivePatterns.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
            </div>`
          : ''
      }
      ${
        gasAnalysis.optimizationSuggestions.length > 0
          ? `<div class="subsection">
              <h3>Optimization Suggestions</h3>
              <ul>${gasAnalysis.optimizationSuggestions.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
            </div>`
          : ''
      }
    </section>`
      : '';

  // Overall recommendations section
  const recsHtml =
    overallRecommendations.length > 0
      ? `
    <section class="report-section" id="recommendations">
      <h2>📋 Overall Recommendations</h2>
      <ol>${overallRecommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ol>
    </section>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audit Report — ${escapeHtml(contractName)} | AI Move Auditor</title>
  <style>
    /* ── Reset & Base ─────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #0d1117;
      color: #e6edf3;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      padding: 0;
      margin: 0;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    a { color: #58a6ff; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* ── Header ────────────────────────────────────────────────── */
    .report-header {
      text-align: center;
      padding: 40px 24px;
      background: linear-gradient(135deg, #161b22 0%, #0d1117 50%, #161b22 100%);
      border-bottom: 1px solid #30363d;
      margin-bottom: 32px;
    }

    .report-header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #f0f6fc;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }

    .report-header .subtitle {
      font-size: 14px;
      color: #8b949e;
      margin-bottom: 20px;
    }

    .contract-name {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 20px;
      color: #58a6ff;
      margin-bottom: 16px;
    }

    .risk-badge {
      display: inline-block;
      padding: 8px 24px;
      border-radius: 20px;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    /* ── Summary Box ──────────────────────────────────────────── */
    .summary-box {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .summary-box h2 {
      font-size: 18px;
      margin-bottom: 12px;
      color: #f0f6fc;
    }

    .summary-meta {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      margin-bottom: 16px;
      font-size: 13px;
      color: #8b949e;
    }

    .summary-meta span {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .summary-text {
      color: #c9d1d9;
      font-size: 15px;
      line-height: 1.7;
    }

    /* ── Severity Counts ──────────────────────────────────────── */
    .severity-counts {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }

    .count-chip {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    /* ── Sections ─────────────────────────────────────────────── */
    .report-section {
      margin-bottom: 32px;
    }

    .report-section h2 {
      font-size: 20px;
      color: #f0f6fc;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #21262d;
    }

    .report-section h3 {
      font-size: 15px;
      color: #c9d1d9;
      margin: 12px 0 8px;
    }

    .report-section ul, .report-section ol {
      padding-left: 24px;
      color: #c9d1d9;
    }

    .report-section li {
      margin-bottom: 8px;
    }

    .subsection {
      margin-bottom: 16px;
    }

    /* ── Finding Cards ────────────────────────────────────────── */
    .finding-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
    }

    .finding-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid #21262d;
      flex-wrap: wrap;
    }

    .severity-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .finding-id {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 13px;
      color: #8b949e;
      flex-shrink: 0;
    }

    .finding-title {
      font-size: 15px;
      font-weight: 600;
      color: #f0f6fc;
    }

    .finding-meta {
      display: flex;
      gap: 12px;
      padding: 10px 20px;
      border-bottom: 1px solid #21262d;
      flex-wrap: wrap;
      font-size: 13px;
    }

    .category-chip {
      background: #21262d;
      color: #c9d1d9;
      padding: 2px 10px;
      border-radius: 10px;
      font-size: 12px;
      text-transform: capitalize;
    }

    .location {
      color: #8b949e;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 12px;
    }

    .line-hint {
      color: #6e7681;
      font-size: 12px;
    }

    .finding-body {
      padding: 16px 20px;
    }

    .section {
      margin-bottom: 16px;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    .section-label {
      font-size: 13px;
      font-weight: 600;
      color: #8b949e;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .section p {
      color: #c9d1d9;
      line-height: 1.6;
    }

    /* ── Code Snippet ─────────────────────────────────────────── */
    .code-snippet {
      margin-top: 12px;
    }

    .code-label {
      font-size: 12px;
      color: #8b949e;
      margin-bottom: 6px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .code-snippet pre {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 16px;
      overflow-x: auto;
      margin: 0;
    }

    .code-snippet code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 13px;
      color: #e6edf3;
      line-height: 1.5;
      white-space: pre;
    }

    /* ── Clean Banner ─────────────────────────────────────────── */
    .clean-banner {
      text-align: center;
      padding: 48px 24px;
      background: #161b22;
      border: 2px solid #238636;
      border-radius: 12px;
      margin-bottom: 24px;
    }

    .clean-icon {
      font-size: 56px;
      margin-bottom: 16px;
    }

    .clean-title {
      font-size: 24px;
      font-weight: 700;
      color: #3fb950;
      margin-bottom: 12px;
    }

    .clean-desc {
      color: #8b949e;
      font-size: 15px;
      max-width: 600px;
      margin: 0 auto;
    }

    /* ── Footer ────────────────────────────────────────────────── */
    .report-footer {
      text-align: center;
      padding: 32px 24px;
      border-top: 1px solid #21262d;
      margin-top: 48px;
      color: #484f58;
      font-size: 13px;
    }

    .report-footer .walrus-logo {
      font-size: 16px;
      color: #58a6ff;
      margin-bottom: 8px;
    }

    /* ── Responsive ────────────────────────────────────────────── */
    @media (max-width: 640px) {
      .container { padding: 16px; }
      .report-header h1 { font-size: 22px; }
      .contract-name { font-size: 16px; }
      .summary-meta { flex-direction: column; gap: 8px; }
      .finding-header { flex-direction: column; align-items: flex-start; gap: 8px; }
      .severity-counts { gap: 6px; }
      .count-chip { font-size: 11px; padding: 4px 10px; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="report-header">
    <h1>🛡️ AI Move Contract Audit Report</h1>
    <div class="subtitle">Automated Security Analysis by AI Move Auditor</div>
    <div class="contract-name">${escapeHtml(contractName)}</div>
    <span class="risk-badge" style="background:${riskColor.bg};color:${riskColor.text}">
      Overall Risk: ${escapeHtml(summary.overallRisk)}
    </span>
  </div>

  <div class="container">

    <!-- Summary Box -->
    <div class="summary-box">
      <h2>📊 Audit Summary</h2>
      <div class="summary-meta">
        <span>🗓️ ${auditDate}</span>
        <span>📦 ${summary.moduleCount} module${summary.moduleCount !== 1 ? 's' : ''}</span>
        <span>📝 ${summary.lineCount} lines</span>
        <span>🔍 ${findings.length} finding${findings.length !== 1 ? 's' : ''}</span>
      </div>
      <p class="summary-text">${escapeHtml(summary.executiveSummary)}</p>
    </div>

    <!-- Severity Counts -->
    <div class="severity-counts">
      ${severityChipsHtml}
    </div>

    <!-- Findings -->
    <section class="report-section" id="findings">
      <h2>🔍 Findings</h2>
      ${findingsHtml}
    </section>

    <!-- Gas Analysis -->
    ${gasHtml}

    <!-- Recommendations -->
    ${recsHtml}

  </div>

  <!-- Footer -->
  <div class="report-footer">
    <div class="walrus-logo">🐘 Walrus Network</div>
    Generated by <strong>AI Move Auditor</strong> | Stored permanently on <strong>Walrus Network</strong><br>
    <span style="color:#6e7681">Report generated on ${auditDate}</span>
  </div>

</body>
</html>`;
}
