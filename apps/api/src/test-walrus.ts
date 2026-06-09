/**
 * Day 3 — Smoke test for WalrusService + ReportService
 *
 * Tests the full pipeline:
 *   1. Generate a mock AuditResult
 *   2. Render it to HTML via ReportService
 *   3. Store the HTML on Walrus via WalrusService
 *   4. Print the aggregator URL for verification
 *
 * Usage:
 *   npx nest build
 *   node dist/test-walrus.js
 *
 * Make sure your .env has the correct WALRUS_PUBLISHER_URL and WALRUS_AGGREGATOR_URL.
 */
import * as dotenv from 'dotenv';
import { WalrusService } from './modules/walrus/walrus.service.js';
import { ReportService } from './modules/report/report.service.js';
import type { AuditResult } from './modules/claude/types/finding.types.js';

dotenv.config();

// ─── Mock audit result for testing ───────────────────────────────────────────

const mockResult: AuditResult = {
  summary: {
    contractName: 'test_contract::vault',
    moduleCount: 1,
    lineCount: 85,
    overallRisk: 'HIGH' as any,
    auditedAt: new Date().toISOString(),
    executiveSummary:
      'This is a TEST report to verify Walrus integration. The contract contains one simulated HIGH severity finding for demonstration purposes.',
  },
  findings: [
    {
      id: 'FIND-001',
      title: 'Simulated Access Control Issue',
      severity: 'HIGH' as any,
      category: 'ACCESS_CONTROL' as any,
      location: {
        module: 'test_contract::vault',
        function: 'withdraw',
        lineHint: 'Line 42',
      },
      description:
        'This is a simulated finding for testing the Walrus + HTML report pipeline. No real vulnerability exists.',
      impact:
        'In a real scenario, this would allow unauthorized withdrawals from the vault.',
      recommendation:
        'Add an ownership check before allowing withdrawals: assert!(tx_context::sender(ctx) == vault.owner, E_NOT_OWNER);',
      codeSnippet:
        'public entry fun withdraw(\n    vault: &mut Vault,\n    amount: u64,\n    ctx: &mut TxContext,\n) {\n    // BUG: No ownership check!\n    let coin = coin::take(&mut vault.balance, amount, ctx);\n    transfer::public_transfer(coin, tx_context::sender(ctx));\n}',
    },
    {
      id: 'FIND-002',
      title: 'Missing Input Validation',
      severity: 'LOW' as any,
      category: 'MISSING_VALIDATION' as any,
      location: {
        module: 'test_contract::vault',
        function: 'deposit',
        lineHint: 'Line 25',
      },
      description:
        'The deposit function does not validate that the amount is greater than zero.',
      impact: 'Users could submit zero-value transactions, wasting gas.',
      recommendation: 'Add assert!(amount > 0, E_ZERO_AMOUNT); at the beginning of the function.',
      codeSnippet: null,
    },
  ],
  gasAnalysis: {
    expensivePatterns: [
      'VecMap iteration in batch_claim (O(n) for each call)',
    ],
    optimizationSuggestions: [
      'Consider using a Table or LinkedTable for pending_rewards instead of VecMap for O(1) lookups.',
    ],
  },
  overallRecommendations: [
    'Implement role-based access control for all admin functions.',
    'Add comprehensive event emission for all state-changing operations.',
    'Consider adding a timelock for sensitive parameter changes.',
  ],
};

// ─── Main test function ──────────────────────────────────────────────────────

async function main() {
  console.log('\n━━━ Day 3: Walrus Integration Test ━━━\n');

  // Step 1: Generate HTML report
  console.log('1️⃣  Generating HTML report...');
  const reportService = new ReportService();
  const html = reportService.generateHtml(mockResult, 'test_contract::vault');
  console.log(`   ✅ HTML generated (${html.length} bytes)`);

  // Step 2: Store on Walrus
  console.log('\n2️⃣  Uploading to Walrus Testnet...');
  const walrusService = new WalrusService();

  try {
    const blobId = await walrusService.storeReport(html);
    console.log(`   ✅ Stored on Walrus!`);
    console.log(`   📦 blobId: ${blobId}`);

    // Step 3: Generate aggregator URL
    const reportUrl = walrusService.getReportUrl(blobId);
    console.log(`\n3️⃣  Report URL:`);
    console.log(`   🔗 ${reportUrl}`);
    console.log(`\n   Open this URL in your browser to verify the report renders correctly.`);

    console.log('\n✅ Walrus integration test PASSED!\n');
  } catch (error) {
    console.error(
      '\n❌ Walrus test failed:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

main();
