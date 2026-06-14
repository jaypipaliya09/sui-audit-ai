#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import EventSource from 'eventsource';
import os from 'os';

const API_BASE_URL = process.env.SUI_AUDIT_API_URL || 'http://localhost:3001';
const CONFIG_DIR = path.join(os.homedir(), '.sui-audit-ai');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// --- Configuration Management ---
function getConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveConfig(config: any) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

// --- Track Resolution ---
function determineTrackFromCommand(cmd: string): string {
  const baseCmd = path.basename(cmd).replace('.js', '');
  
  if (baseCmd === 'defi-audit') return 'DeFi';
  if (baseCmd === 'deepbook-audit') return 'DeepBook';
  if (baseCmd === 'dex-audit') return 'DEX';
  if (baseCmd === 'lending-audit') return 'Lending';
  if (baseCmd === 'nft-audit') return 'NFT';
  if (baseCmd === 'staking-audit') return 'Staking';
  if (baseCmd === 'stablecoin-audit') return 'Stablecoin';
  if (baseCmd === 'dao-audit') return 'DAO';
  if (baseCmd === 'aggregator-audit') return 'Aggregator';
  if (baseCmd === 'bridge-audit') return 'Bridge';
  
  return 'General';
}

// --- Main Audit Flow ---
async function runAudit(filePath: string, options: any) {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  const isJson = options.json;
  
  if (!fs.existsSync(resolvedPath)) {
    if (isJson) {
      console.log(JSON.stringify({ error: `File not found at ${resolvedPath}` }));
    } else {
      console.error(chalk.red(`\nError: File not found at ${resolvedPath}\n`));
    }
    process.exit(1);
  }

  const contractCode = fs.readFileSync(resolvedPath, 'utf8');
  const contractName = path.basename(resolvedPath, '.move') || 'contract';
  const track = determineTrackFromCommand(process.argv[1]);
  const config = getConfig();

  if (!config.apiKey && !isJson) {
    console.log(chalk.yellow(`\nWarning: No API key found. You may be severely rate-limited or blocked. Run '${path.basename(process.argv[1])} login <API_KEY>' to authenticate.\n`));
  }

  let spinner: any = null;
  if (!isJson) {
    console.log(chalk.cyan(`\n🚀 Sui Move Auditor CLI`));
    console.log(chalk.gray(`File: ${resolvedPath}`));
    console.log(chalk.gray(`Track: ${chalk.bold(track)}\n`));
    spinner = ora('Submitting contract for audit...').start();
  }

  try {
    // 1. Submit the Audit
    const headers: any = { 'Content-Type': 'application/json' };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const submitRes = await fetch(`${API_BASE_URL}/audit/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ contractCode, contractName, track })
    });

    if (!submitRes.ok) {
      let errBody = await submitRes.text();
      try { errBody = JSON.parse(errBody).message || errBody; } catch {}
      
      if (isJson) {
        console.log(JSON.stringify({ error: errBody, status: submitRes.status }));
        process.exit(1);
      } else {
        spinner.fail('Submission failed');
        console.error(chalk.red(errBody));
        process.exit(1);
      }
    }

    const { auditId, statusUrl, reportUrl } = await submitRes.json() as any;
    
    // 2. Listen to SSE for progress
    if (!isJson) spinner.text = 'Waiting for worker...';
    
    await new Promise<void>((resolve, reject) => {
      const es = new EventSource(`${API_BASE_URL}${statusUrl}`);
      
      const handleEvent = (event: any) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'progress' && !isJson) {
            spinner.text = `[${data.pct}%] ${data.message}`;
          } else if (data.type === 'complete') {
            if (!isJson) spinner.succeed('Audit Analysis Complete\n');
            es.close();
            resolve();
          } else if (data.type === 'error') {
            if (!isJson) spinner.fail(`Audit Failed: ${data.errorMessage}`);
            es.close();
            reject(new Error(data.errorMessage));
          }
        } catch (e) {}
      };

      es.addEventListener('progress', handleEvent);
      es.addEventListener('complete', handleEvent);
      es.addEventListener('message', handleEvent); // fallback

      es.onerror = (err: any) => {
        // EventSource onerror fires for both network errors and server-sent error events 
        // without an explicit 'event: error' name sometimes. 
        // If we get here and it's not a custom error, we handle it as network loss.
        if (err && err.data) {
           handleEvent(err);
        } else {
           if (!isJson) spinner.fail('Lost connection to audit server');
           es.close();
           reject(new Error('SSE Error'));
        }
      };
    });

    // 3. Fetch Final Report
    if (!isJson) spinner.start('Fetching final report...');
    const reportRes = await fetch(`${API_BASE_URL}${reportUrl}`);
    if (!reportRes.ok) {
      throw new Error('Failed to fetch final report');
    }

    const reportData = await reportRes.json() as any;
    if (!isJson) spinner.stop();

    // 4. Output Export/Formatting
    if (options.report) {
      const outPath = path.resolve(process.cwd(), options.report);
      fs.writeFileSync(outPath, JSON.stringify({ track, ...reportData }, null, 2));
      if (!isJson) console.log(chalk.green(`\n✔ Report exported to ${outPath}\n`));
    }

    if (isJson) {
      console.log(JSON.stringify({ track, riskScore: reportData.overallRisk, findings: reportData.findingsJson }, null, 2));
      return;
    }

    // Human Readable Output
    console.log(chalk.green.bold('✔ Contract Loaded\n'));
    console.log(`Track: ${chalk.cyan(track)}\n`);
    
    console.log(chalk.bold('Security Findings:'));
    if (!reportData.findingsJson || reportData.findingsJson.length === 0) {
      console.log(chalk.green('- No significant security findings found.'));
    } else {
      let crit = 0, high = 0, med = 0, low = 0;
      reportData.findingsJson.forEach((finding: any) => {
        let severityColor = chalk.white;
        if (finding.severity === 'CRITICAL') { severityColor = chalk.red; crit++; }
        else if (finding.severity === 'HIGH') { severityColor = chalk.redBright; high++; }
        else if (finding.severity === 'MEDIUM') { severityColor = chalk.yellow; med++; }
        else if (finding.severity === 'LOW') { severityColor = chalk.blue; low++; }
        
        console.log(`${severityColor('-')} ${finding.title} ${severityColor(`[${finding.severity}]`)}`);
      });

      console.log(chalk.gray(`\nSummary: ${crit} Critical, ${high} High, ${med} Medium, ${low} Low`));
    }

    console.log(`\nRisk Score: ${chalk.bold(reportData.overallRisk)}`);
    console.log(chalk.green.bold('\nAudit Completed Successfully\n'));

  } catch (error: any) {
    if (isJson) {
      console.log(JSON.stringify({ error: error.message || 'An unexpected error occurred' }));
    } else {
      spinner?.fail(error.message || 'An unexpected error occurred');
    }
    process.exit(1);
  }
}

// --- CLI Setup ---
const program = new Command();

program
  .name(path.basename(process.argv[1] || 'sui-audit').replace('.js', ''))
  .description('Audit Sui Move Smart Contracts with AI');

program
  .command('login <api_key>')
  .description('Authenticate with your API key to consume audit credits')
  .action((apiKey) => {
    const config = getConfig();
    config.apiKey = apiKey;
    saveConfig(config);
    console.log(chalk.green(`\n✔ Successfully authenticated and saved API key to ${CONFIG_FILE}\n`));
  });

program
  .argument('[file]', 'Path to the .move file to audit')
  .option('--json', 'Output results in pure JSON format')
  .option('--report <file>', 'Export the JSON report to a file (e.g. report.json)')
  .action((file, options) => {
    if (file) {
      runAudit(file, options);
    } else {
      program.help();
    }
  });

program.parse();
