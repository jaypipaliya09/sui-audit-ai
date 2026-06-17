#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import prompts from 'prompts';
import { join } from 'path';
import { writeFileSync, existsSync, appendFileSync } from 'fs';

import { ClaudeCliService } from './auditor/claude-cli.service';
import { GroqReportService } from './report/groq.service';
import { SlushWalletService } from './wallet/slush.service';
import { planForFile, planForCodebase, AuditPlan } from './scan/scanner';
import { AuditRunner, RunSummary } from './audit/runner';
import { TRACKS, Track } from './audit/tracks';
import { PaymentService, HoldId } from './payment/payment.service';
import { EscrowPaymentService } from './payment/escrow.service';
import { MockPaymentService } from './payment/mock.service';
import { loadPayerKeypair } from './sui/client';
import { loadConfig, saveConfig, BACKEND_URL, FRONTEND_URL } from './config';

function buildPaymentService(): PaymentService {
  if (process.env.MOVE_AUDITOR_MOCK_PAYMENT === '1') {
    console.log(chalk.yellow('Using MOCK payment service (no real funds moved).'));
    return new MockPaymentService();
  }
  const payer = loadPayerKeypair();
  if (!payer) {
    throw new Error(
      'MOVE_AUDITOR_SECRET_KEY is not configured. Set it in the environment and restart.',
    );
  }
  const escrowPackageId = process.env.ESCROW_PACKAGE_ID?.trim() ?? '';
  const treasuryAddress = process.env.TREASURY_ADDRESS?.trim() ?? '';
  if (!escrowPackageId) throw new Error('ESCROW_PACKAGE_ID is not configured.');
  if (!treasuryAddress) throw new Error('TREASURY_ADDRESS is not configured.');
  return new EscrowPaymentService(payer, escrowPackageId, treasuryAddress);
}

/** Step 1: ask for and validate the Slush wallet. */
async function connectWallet(): Promise<{ address: string; balanceSui: number }> {
  const { address } = await prompts({
    type: 'text',
    name: 'address',
    message: 'Enter your Slush wallet address',
  });
  if (!address) throw new Error('No wallet address provided.');

  console.log(chalk.blue('Validating wallet...'));
  const wallet = await new SlushWalletService().validate(address);
  if (!wallet.valid) {
    throw new Error(`Wallet is not valid or not found: ${address}`);
  }

  console.log(
    chalk.green(`✓ Wallet OK — balance: ${wallet.balanceSui} SUI (${wallet.address})`),
  );

  return { address: wallet.address, balanceSui: wallet.balanceSui };
}

/** Step 1b: pick the project track so the audit is focused (and cheaper). */
async function selectTrack(): Promise<Track> {
  const { track } = await prompts({
    type: 'select',
    name: 'track',
    message: 'Which track does this project belong to?',
    hint: 'Focuses the audit on the risks that matter for this kind of project',
    choices: TRACKS.map((t) => ({
      title: t.title,
      description: t.description,
      value: t.value,
    })),
  });
  const selected = TRACKS.find((t) => t.value === track);
  if (!selected) throw new Error('No track selected.');
  console.log(chalk.green(`✓ Auditing for the ${selected.title} track.`));
  return selected;
}

/** Step 2 + 3: choose scope and compute cost. */
async function selectPlan(): Promise<AuditPlan> {
  const { scope } = await prompts({
    type: 'select',
    name: 'scope',
    message: 'What do you want to audit?',
    choices: [
      { title: 'A single .move file', value: 'file' },
      { title: 'The full codebase', value: 'codebase' },
    ],
  });

  let plan: AuditPlan;
  if (scope === 'file') {
    const { path } = await prompts({
      type: 'text',
      name: 'path',
      message: 'Path to the .move file',
    });
    plan = planForFile(path);
  } else {
    const { dir } = await prompts({
      type: 'text',
      name: 'dir',
      message: 'Codebase root directory',
      initial: process.cwd(),
    });
    plan = planForCodebase(dir);
  }

  if (plan.files.length === 0) {
    throw new Error('No .move files found to audit.');
  }
  return plan;
}

interface UploadedFile {
  file: string;
  blobId?: string;
  walrusUrl?: string;
}
interface UploadedRun {
  id: string | null;
  files: UploadedFile[];
}

/** Upload the run to the backend so it shows in the per-user report UI. */
async function uploadRun(summary: RunSummary): Promise<UploadedRun | null> {
  if (!BACKEND_URL) return null;
  try {
    const res = await fetch(`${BACKEND_URL.replace(/\/$/, '')}/audit-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: summary.walletAddress,
        totalCostSui: summary.totalCostSui,
        files: summary.files.map((f) => ({
          file: f.file,
          overallRisk: f.overallRisk,
          findingsCount: f.findingsCount,
          markdown: f.markdown,
          audit: f.audit,
        })),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      files?: UploadedFile[];
    };
    console.log(chalk.green('✓ Reports uploaded.'));
    return { id: data.id ?? null, files: data.files ?? [] };
  } catch (error) {
    console.warn(chalk.yellow(`Could not upload reports: ${(error as Error).message}`));
    return null;
  }
}

/**
 * The backend stores each report as a permanent PDF on Walrus and returns its
 * public URL. Append that link to the local Markdown report (and print it) so
 * every audit report carries its on-chain, tamper-proof copy.
 */
function attachWalrusLinks(summary: RunSummary, uploaded: UploadedRun | null): void {
  if (!uploaded || uploaded.files.length === 0) return;

  const byFile = new Map(uploaded.files.map((f) => [f.file, f]));
  const linked: { file: string; url: string }[] = [];

  for (const result of summary.files) {
    const match = byFile.get(result.file);
    if (!match?.walrusUrl) continue;
    try {
      const footer =
        `\n\n---\n\n## 🌊 Stored on Walrus\n\n` +
        `This report is permanently stored on Walrus (decentralized storage):\n\n` +
        `- **Report:** [${match.walrusUrl}](${match.walrusUrl})\n` +
        (match.blobId ? `- **Blob ID:** \`${match.blobId}\`\n` : '');
      appendFileSync(result.reportPath, footer, 'utf-8');
      linked.push({ file: result.file, url: match.walrusUrl });
    } catch (error) {
      console.warn(
        chalk.yellow(`Could not attach Walrus link to ${result.reportPath}: ${(error as Error).message}`),
      );
    }
  }

  if (linked.length > 0) {
    console.log(chalk.cyan('\n🌊 Reports stored permanently on Walrus:'));
    linked.forEach(({ file, url }) =>
      console.log(chalk.cyan(`   • ${file}\n     ${url}`)),
    );
  }
}

async function runWizard(): Promise<void> {
  console.log(chalk.green('\n=== Move Auditor ===\n'));

  const { address: walletAddress, balanceSui } = await connectWallet();
  const track = await selectTrack();
  const plan = await selectPlan();

  // Cost summary
  console.log(chalk.bold(`\nFound ${plan.files.length} file(s):`));
  plan.files.slice(0, 10).forEach((f) => console.log(chalk.gray(`  • ${f}`)));
  if (plan.files.length > 10) console.log(chalk.gray(`  …and ${plan.files.length - 10} more`));
  console.log(chalk.bold(`\nTotal cost: ${plan.totalCostSui} SUI (1 SUI per file)\n`));

  // Pre-flight: ensure the wallet can cover the cost + a gas buffer, so we fail
  // here with a clear message instead of an on-chain InsufficientCoinBalance.
  const GAS_BUFFER_SUI = 0.1;
  if (!process.env.MOVE_AUDITOR_MOCK_PAYMENT && balanceSui < plan.totalCostSui + GAS_BUFFER_SUI) {
    throw new Error(
      `Insufficient balance: need ~${plan.totalCostSui + GAS_BUFFER_SUI} SUI ` +
        `(${plan.totalCostSui} to block + gas), but ${walletAddress} has ${balanceSui} SUI.`,
    );
  }

  const { proceed } = await prompts({
    type: 'confirm',
    name: 'proceed',
    message: `Block ${plan.totalCostSui} SUI and start auditing?`,
    initial: false,
  });
  if (!proceed) {
    console.log(chalk.yellow('Cancelled. No funds were blocked.'));
    return;
  }

  const payment = buildPaymentService();

  // Step 4: block funds
  console.log(chalk.blue('\nBlocking funds...'));
  const hold = await payment.hold(plan.totalCostSui);
  console.log(chalk.green(`✓ Blocked ${hold.amountSui} SUI (escrow ${hold.escrowId})`));
  saveConfig({
    ...loadConfig(),
    pendingHold: {
      escrowId: hold.escrowId,
      amountSui: hold.amountSui,
      createdAt: new Date().toISOString(),
    },
  });

  // Rollback on Ctrl+C / fatal errors
  let finalized = false;
  const rollback = async (reason: string) => {
    if (finalized) return;
    finalized = true;
    console.log(chalk.yellow(`\n${reason} — releasing blocked funds...`));
    try {
      await payment.release(hold);
      clearPendingHold(hold);
      console.log(chalk.green('✓ Funds released. You were not charged.'));
    } catch (error) {
      console.error(chalk.red(`Failed to release funds: ${(error as Error).message}`));
      console.error(chalk.red(`Escrow ${hold.escrowId} can be refunded manually.`));
    }
    process.exit(130);
  };
  const onSigint = () => void rollback('Interrupted (Ctrl+C)');
  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigint);

  // Step 5: run the audit
  try {
    const outputDir = join(process.cwd(), 'move-auditor-reports');
    const summary = await new AuditRunner().run(
      plan.files,
      outputDir,
      walletAddress,
      plan.totalCostSui,
      track,
    );

    // Step: deposit on success
    console.log(chalk.blue('\nAudit complete — depositing payment...'));
    await payment.capture(hold);
    finalized = true;
    clearPendingHold(hold);
    console.log(chalk.green(`✓ Deposited ${hold.amountSui} SUI.`));

    const uploaded = await uploadRun(summary);
    attachWalrusLinks(summary, uploaded);

    console.log(chalk.green(`\n✓ Done. Reports saved to ${outputDir}`));
    if (BACKEND_URL) {
      const reportUrl = `${FRONTEND_URL.replace(/\/$/, '')}/my-audits`;
      console.log(chalk.cyan('\n📄 View your report in the browser:'));
      console.log(chalk.cyan.underline(`   ${reportUrl}`));
      console.log(chalk.gray(`   (connect wallet ${walletAddress.slice(0, 10)}… to see it)`));
    }
  } catch (error) {
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigint);
    await rollback(`Audit failed: ${(error as Error).message}`);
  } finally {
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigint);
  }
}

function clearPendingHold(hold: HoldId): void {
  const config = loadConfig();
  if (config.pendingHold?.escrowId === hold.escrowId) {
    delete config.pendingHold;
    saveConfig(config);
  }
}

/** On launch, offer to release an escrow left open by a previous crash. */
async function recoverPendingHold(payment: () => PaymentService): Promise<void> {
  const config = loadConfig();
  if (!config.pendingHold) return;

  const { escrowId, amountSui } = config.pendingHold;
  console.log(
    chalk.yellow(`\nFound an unfinished escrow (${amountSui} SUI, ${escrowId}).`),
  );
  const { release } = await prompts({
    type: 'confirm',
    name: 'release',
    message: 'Release those blocked funds back to your wallet?',
    initial: true,
  });
  if (release) {
    await payment().release({ escrowId, amountSui, txDigest: '' });
    delete config.pendingHold;
    saveConfig(config);
    console.log(chalk.green('✓ Funds released.'));
  }
}

const program = new Command();

program
  .name('move-auditor')
  .description('Audit Sui Move contracts with Claude, pay per file from your Slush wallet')
  .version('1.0.0');

program
  .command('audit', { isDefault: true })
  .description('Interactive: connect wallet, choose files, pay per file, audit')
  .action(async () => {
    try {
      await recoverPendingHold(buildPaymentService);
      await runWizard();
    } catch (error) {
      console.error(chalk.red(`\n${(error as Error).message}`));
      process.exit(1);
    }
  });

program
  .command('scan')
  .description('Audit a single .move file directly (no payment, power-user mode)')
  .argument('<path>', 'Path to the .move file')
  .option('-o, --output <path>', 'Path to save the Markdown report', './audit-report.md')
  .action(async (path: string, options: { output: string }) => {
    if (!existsSync(path)) {
      console.error(chalk.red(`Error: File not found at ${path}`));
      process.exit(1);
    }
    try {
      const audit = await new ClaudeCliService().auditContract(path);
      const markdown = await new GroqReportService().generateMarkdownReport(audit);
      const outputPath = join(process.cwd(), options.output);
      writeFileSync(outputPath, markdown, 'utf-8');
      console.log(chalk.green(`\n✓ Report saved to ${outputPath}\n`));
    } catch {
      console.error(chalk.red('\nProcess failed.'));
      process.exit(1);
    }
  });

program.parse(process.argv);
