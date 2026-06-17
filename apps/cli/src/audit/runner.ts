import chalk from 'chalk';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { ClaudeCliService, AuditResult } from '../auditor/claude-cli.service';
import { GroqReportService } from '../report/groq.service';
import { reportFileName } from '../scan/scanner';
import { Track } from './tracks';

export interface FileAuditResult {
  file: string;
  reportPath: string;
  overallRisk: string;
  findingsCount: number;
  audit: AuditResult;
  markdown: string;
}

export interface RunSummary {
  walletAddress: string;
  files: FileAuditResult[];
  totalCostSui: number;
  outputDir: string;
}

/**
 * Audits every file in the plan. Throws on the first failure so the caller can
 * release the blocked funds (no partial capture). Reports are written per file.
 */
export class AuditRunner {
  private readonly claude = new ClaudeCliService();
  private readonly groq = new GroqReportService();

  async run(
    files: string[],
    outputDir: string,
    walletAddress: string,
    totalCostSui: number,
    track?: Track,
  ): Promise<RunSummary> {
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    const results: FileAuditResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(chalk.bold(`\n[${i + 1}/${files.length}] ${basename(file)}`));

      console.log(chalk.blue('  • Auditing with Claude...'));
      const audit = await this.claude.auditContract(file, track);

      console.log(chalk.blue('  • Generating report with Groq...'));
      const markdown = await this.groq.generateMarkdownReport(audit);

      const reportPath = join(outputDir, reportFileName(file));
      writeFileSync(reportPath, markdown, 'utf-8');
      writeFileSync(
        reportPath.replace(/\.md$/, '.json'),
        JSON.stringify(audit, null, 2),
        'utf-8',
      );

      console.log(
        chalk.green(
          `  ✓ ${audit.summary.overallRisk} — ${audit.findings.length} finding(s) → ${reportPath}`,
        ),
      );

      results.push({
        file,
        reportPath,
        overallRisk: audit.summary.overallRisk,
        findingsCount: audit.findings.length,
        audit,
        markdown,
      });
    }

    const summary: RunSummary = {
      walletAddress,
      files: results,
      totalCostSui,
      outputDir,
    };
    this.writeSummary(summary);
    return summary;
  }

  private writeSummary(summary: RunSummary): void {
    const lines: string[] = [
      `# Move Auditor — Run Summary`,
      ``,
      `- **Wallet:** \`${summary.walletAddress}\``,
      `- **Files audited:** ${summary.files.length}`,
      `- **Total cost:** ${summary.totalCostSui} SUI`,
      ``,
      `| File | Risk | Findings | Report |`,
      `| --- | --- | --- | --- |`,
      ...summary.files.map(
        (f) =>
          `| ${basename(f.file)} | ${f.overallRisk} | ${f.findingsCount} | ${basename(f.reportPath)} |`,
      ),
    ];
    writeFileSync(join(summary.outputDir, 'SUMMARY.md'), lines.join('\n'), 'utf-8');
  }
}
