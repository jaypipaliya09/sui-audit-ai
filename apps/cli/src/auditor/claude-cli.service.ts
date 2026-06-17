import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import chalk from 'chalk';
import { Track } from '../audit/tracks';

/** Run the Claude CLI passing the prompt via argv (no shell interpolation). */
function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', prompt], {
      maxBuffer: 1024 * 1024 * 10,
    } as any);

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`claude exited with code ${code}: ${stderr}`));
    });
  });
}

export interface AuditFindingFull {
  id: string;
  title: string;
  severity: string;
  category: string;
  location: { module: string; function: string | null; lineHint: string };
  description: string;
  impact: string;
  recommendation: string;
  codeSnippet: string | null;
}

export interface AuditSummary {
  contractName: string;
  moduleCount: number;
  lineCount: number;
  overallRisk: string;
  executiveSummary: string;
}

export interface GasAnalysis {
  expensivePatterns: string[];
  optimizationSuggestions: string[];
}

/** Full structured audit, matching the web report schema for identical UI. */
export interface AuditResult {
  summary: AuditSummary;
  findings: AuditFindingFull[];
  gasAnalysis: GasAnalysis;
  overallRecommendations: string[];
}

export class ClaudeCliService {
  /**
   * Reads a file and uses the local Claude Code CLI to analyze it.
   */
  async auditContract(filePath: string, track?: Track): Promise<AuditResult> {
    console.log(chalk.blue(`Reading contract from ${filePath}...`));
    
    let fileContent: string;
    try {
      fileContent = readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : error}`);
    }

    const lineCount = fileContent.split('\n').length;

    const trackContext = track
      ? `\nProject track: ${track.title} — ${track.description}.\nTrack-specific focus: ${track.focus}\n`
      : '';

    const prompt = `You are an expert security auditor for Sui Move smart contracts.
Audit the following code thoroughly (access control, asset safety, arithmetic, DoS, logic flaws, gas).
${trackContext}IMPORTANT: Your response MUST be ONLY valid JSON with no markdown formatting around it.
No conversational filler. Do not include \`\`\`json or \`\`\`.

The JSON MUST match this structure exactly:
{
  "summary": {
    "contractName": "NameOfContract",
    "moduleCount": <number of modules>,
    "lineCount": ${lineCount},
    "overallRisk": "CLEAN|LOW|MEDIUM|HIGH|CRITICAL",
    "executiveSummary": "2-4 sentence high-level summary of the contract's security posture"
  },
  "findings": [
    {
      "id": "FIND-001",
      "title": "Short descriptive title",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
      "category": "ACCESS_CONTROL|ARITHMETIC|DOS|LOGIC|ASSET_SAFETY|GAS|OTHER",
      "location": { "module": "module::name", "function": "function_name or null", "lineHint": "Lines X-Y or Line X" },
      "description": "Detailed description of the issue",
      "impact": "What an attacker can do / the consequence",
      "recommendation": "How to fix it",
      "codeSnippet": "the relevant code snippet or null"
    }
  ],
  "gasAnalysis": {
    "expensivePatterns": ["..."],
    "optimizationSuggestions": ["..."]
  },
  "overallRecommendations": ["Prioritized recommendation 1", "..."]
}

Use incremental ids (FIND-001, FIND-002, ...). If no issues, set overallRisk to "CLEAN" and findings to [].

Code to audit:
${fileContent}`;

    console.log(chalk.blue(`Invoking Claude Code CLI... (This may take a minute)`));

    try {
      const stdout = await runClaude(prompt);

      const jsonStr = this.extractJson(stdout);
      const parsed = JSON.parse(jsonStr) as AuditResult;
      
      return parsed;

    } catch (error) {
      console.error(chalk.red('Failed to execute Claude CLI or parse response.'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      throw error;
    }
  }

  /**
   * Robustly extracts JSON from stdout in case Claude prints conversational filler
   */
  private extractJson(text: string): string {
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1) {
      throw new Error("Could not find JSON object in Claude's output:\n" + text);
    }
    
    return text.substring(startIdx, endIdx + 1);
  }
}
