/**
 * Day 2 — Smoke test for ClaudeService
 *
 * Reads a Move contract from examples/ and runs it through the Claude audit.
 * Usage:
 *   # First build, then run:
 *   npx nest build
 *   node dist/test-claude.js [vulnerable|clean|empty]
 *
 * Make sure your .env has a valid ANTHROPIC_API_KEY before running.
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { ClaudeService } from './modules/claude/claude.service.js';

dotenv.config();

async function main() {
  const mode = process.argv[2] || 'vulnerable';
  let contractCode: string;
  let contractName: string;

  const examplesDir = path.resolve(__dirname, '../../../examples');

  switch (mode) {
    case 'vulnerable':
      contractCode = fs.readFileSync(
        path.join(examplesDir, 'vulnerable_defi.move'),
        'utf-8',
      );
      contractName = 'vulnerable_defi::vault';
      break;

    case 'clean':
      contractCode = fs.readFileSync(
        path.join(examplesDir, 'clean_nft.move'),
        'utf-8',
      );
      contractName = 'clean_nft::collection';
      break;

    case 'empty':
      contractCode = 'module empty::test {\n  // empty module\n}';
      contractName = 'empty::test';
      break;

    default:
      console.error(
        'Usage: node dist/test-claude.js [vulnerable|clean|empty]',
      );
      process.exit(1);
  }

  console.log(`\n━━━ Testing Claude Audit: ${contractName} ━━━`);
  console.log(`Contract: ${contractCode.split('\n').length} lines\n`);

  // Create the service directly (bypassing NestJS DI for this test)
  const service = new ClaudeService();

  try {
    const result = await service.auditContract(
      contractCode,
      contractName,
      undefined,
      (pct, msg) => {
        console.log(`  [${pct}%] ${msg}`);
      },
    );

    console.log('\n━━━ AUDIT RESULT ━━━');
    console.log(`Overall Risk:  ${result.summary.overallRisk}`);
    console.log(`Findings:      ${result.findings.length}`);
    console.log(`Summary:       ${result.summary.executiveSummary}`);

    if (result.findings.length > 0) {
      console.log('\n━━━ FINDINGS ━━━');
      for (const finding of result.findings) {
        console.log(
          `  [${finding.severity}] ${finding.id}: ${finding.title}`,
        );
        console.log(`    Category: ${finding.category}`);
        console.log(
          `    Location: ${finding.location.module}::${finding.location.function || '(module-level)'}`,
        );
        console.log(
          `    Impact: ${finding.impact.substring(0, 120)}...`,
        );
        console.log('');
      }
    }

    if (result.gasAnalysis.expensivePatterns.length > 0) {
      console.log('━━━ GAS ANALYSIS ━━━');
      for (const p of result.gasAnalysis.expensivePatterns) {
        console.log(`  ⚠ ${p}`);
      }
    }

    if (result.overallRecommendations.length > 0) {
      console.log('\n━━━ RECOMMENDATIONS ━━━');
      for (const r of result.overallRecommendations) {
        console.log(`  → ${r}`);
      }
    }

    console.log('\n✅ Audit completed successfully!\n');

    // Also dump the full JSON for inspection
    console.log('━━━ FULL JSON ━━━');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(
      '\n❌ Audit failed:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

main();
