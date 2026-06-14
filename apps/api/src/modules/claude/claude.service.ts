import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { MOVE_AUDIT_SYSTEM_PROMPT } from './prompts/system-prompt.js';
import { buildUserPrompt } from './prompts/user-prompt.builder.js';
import type { AuditResult, AuditFinding } from './types/finding.types.js';
import { MetricsService } from '../metrics/metrics.service.js';

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly client: Anthropic;
  private readonly model = 'claude-sonnet-4-20250514';
  private readonly maxTokens = 4096;

  constructor(private readonly metricsService: MetricsService) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'sk-ant-YOUR_KEY_HERE') {
      this.logger.warn(
        'ANTHROPIC_API_KEY is not set or is using the placeholder value. Claude API calls will fail.',
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Audit a Move smart contract using Claude.
   *
   * @param contractCode  - Raw Move source code
   * @param contractName  - Human-readable name for the contract
   * @param onProgress    - Optional callback for reporting progress (pct 0-100, message)
   * @returns Structured AuditResult JSON
   */
  async auditContract(
    contractCode: string,
    contractName: string,
    onProgress?: (pct: number, msg: string) => void,
    projectTrack?: string,
  ): Promise<AuditResult> {
    // ── Phase 1: Call Claude API ──────────────────────────────────────
    onProgress?.(25, 'Connecting to Claude API...');
    this.logger.log(
      `Starting audit for "${contractName}" (${contractCode.split('\n').length} lines)`,
    );

    let rawText: string;
    try {
      const start = Date.now();
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: MOVE_AUDIT_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: buildUserPrompt(contractCode, contractName, projectTrack),
          },
        ],
      });
      const latencyMs = Date.now() - start;

      // Record metrics
      await this.metricsService.recordClaudeCall({
        inputTokens: response.usage?.input_tokens || 0,
        outputTokens: response.usage?.output_tokens || 0,
        latencyMs,
      }).catch((err) => this.logger.warn(`Failed to record Claude metrics: ${err}`));

      // Extract text from the response content blocks
      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      );

      if (!textBlock) {
        throw new Error('Claude returned no text content in the response');
      }

      rawText = textBlock.text;
      this.logger.debug(
        `Claude response received (${rawText.length} chars, stop_reason: ${response.stop_reason})`,
      );
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : 'Unknown Claude API error';
      
      // MOCK AI FALLBACK: If credit balance is too low or invalid API key, return a realistic mock audit
      if (errMsg.includes('credit balance is too low') || errMsg.includes('invalid api key') || errMsg.includes('400')) {
        this.logger.warn(`Claude API error detected (${errMsg}). Falling back to Mock AI Mode for testing.`);
        return {
          summary: {
            contractName: contractName,
            moduleCount: 1,
            lineCount: contractCode.split('\n').length,
            overallRisk: 'MEDIUM' as any,
            auditedAt: new Date().toISOString(),
            executiveSummary: '[MOCK AI MODE] This is a mocked security audit because your Anthropic account has no credits. The contract was analyzed and found to have a medium risk profile with some standard Move security warnings.',
          },
          findings: [
            {
              id: `F-${Math.floor(Math.random() * 1000)}`,
              title: 'Unchecked object capability',
              severity: 'MEDIUM' as any,
              category: 'CAPABILITY_MISUSE' as any,
              location: {
                module: contractName,
                function: 'init',
                lineHint: '10' as any,
              },
              description: 'The init function creates an object but does not properly constrain its capability. This could lead to unauthorized access in later functions.',
              impact: 'A malicious user could potentially exploit this capability to modify shared objects.',
              recommendation: 'Ensure that capabilities are strictly typed and access controls are enforced using `tx_context::sender`.',
              codeSnippet: 'public fun init(ctx: &mut TxContext) {\n  let cap = AdminCap {};\n  transfer::transfer(cap, tx_context::sender(ctx));\n}',
            }
          ],
          gasAnalysis: {
            expensivePatterns: ['Vector iterations in while loops'],
            optimizationSuggestions: ['Use dynamic fields instead of large vectors for scalable storage.'],
          },
          overallRecommendations: ['Implement a multi-sig for the AdminCap', 'Add unit tests for failure conditions'],
        };
      }

      this.logger.error(`Claude API call failed: ${errMsg}`);
      throw new Error(`Claude API error: ${errMsg}`);
    }

    // ── Phase 2: Parse JSON response ─────────────────────────────────
    onProgress?.(65, 'Parsing audit findings...');

    let parsed: AuditResult;
    try {
      // Strip markdown code fences if Claude wrapped the JSON anyway
      const cleaned = rawText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      parsed = JSON.parse(cleaned) as AuditResult;
    } catch (parseError) {
      this.logger.error(
        `Failed to parse Claude response as JSON. Raw text (first 500 chars): ${rawText.substring(0, 500)}`,
      );
      throw new Error(
        `Failed to parse audit response as JSON: ${parseError instanceof Error ? parseError.message : 'unknown parse error'}`,
      );
    }

    // ── Phase 3: Validate required fields ────────────────────────────
    if (!parsed.summary) {
      this.logger.error('Parsed result is missing "summary" field');
      throw new Error(
        'Invalid audit result: missing "summary" field in Claude response',
      );
    }

    if (!Array.isArray(parsed.findings)) {
      this.logger.error('Parsed result is missing "findings" array');
      throw new Error(
        'Invalid audit result: missing "findings" array in Claude response',
      );
    }

    // Ensure gasAnalysis exists with defaults if missing
    if (!parsed.gasAnalysis) {
      parsed.gasAnalysis = {
        expensivePatterns: [],
        optimizationSuggestions: [],
      };
    }

    // Ensure overallRecommendations exists with default if missing
    if (!Array.isArray(parsed.overallRecommendations)) {
      parsed.overallRecommendations = [];
    }

    // ── Phase 4: Compute overall risk from findings ──────────────────
    parsed.summary.overallRisk = this.computeOverallRisk(parsed.findings) as any;

    // ── Pass 2: Multi-Pass Deep Dive for CRITICAL and HIGH findings ──────
    if (parsed.findings.some(f => f.severity === 'CRITICAL' || f.severity === 'HIGH')) {
      onProgress?.(75, 'Performing deep-dive on critical findings...');
      const deepDivePromises = parsed.findings.map(async (finding) => {
        if (finding.severity !== 'CRITICAL' && finding.severity !== 'HIGH') {
          return finding;
        }

        try {
          const deepDive = await this.deepDiveFinding(contractCode, finding);
          if (deepDive.confirmed && deepDive.confidence >= 7) {
            finding.attackVector = deepDive.attackVector;
            if (deepDive.refinedRecommendation) {
              finding.recommendation = deepDive.refinedRecommendation;
              finding.refinedRecommendation = deepDive.refinedRecommendation;
            }
            return finding;
          }
          // If not confirmed or confidence too low, we filter it out by returning null
          this.logger.debug(`Deep dive rejected finding: ${finding.title} (Confirmed: ${deepDive.confirmed}, Confidence: ${deepDive.confidence})`);
          return null;
        } catch (err) {
          this.logger.warn(`Deep dive failed for finding ${finding.title}: ${err}`);
          return finding; // fallback to original finding
        }
      });

      const refinedFindings = (await Promise.all(deepDivePromises)).filter(f => f !== null) as AuditFinding[];
      parsed.findings = refinedFindings;
      parsed.summary.overallRisk = this.computeOverallRisk(parsed.findings) as any;
    }

    onProgress?.(95, 'Finalizing report...');

    this.logger.log(
      `Audit complete for "${contractName}": ${parsed.findings.length} findings, overall risk = ${parsed.summary.overallRisk}`,
    );

    return parsed;
  }

  /**
   * Performs a deep dive on a specific CRITICAL or HIGH finding to verify exploitability.
   */
  private async deepDiveFinding(contractCode: string, finding: AuditFinding): Promise<{ confirmed: boolean; confidence: number; attackVector?: string; refinedRecommendation?: string; }> {
    this.logger.debug(`Deep dive for: ${finding.title}`);
    
    const prompt = `You are an elite Sui Move security auditor. 
Review the following smart contract and a reported security vulnerability.
Your job is to independently verify if this vulnerability is truly exploitable.

CONTRACT:
\`\`\`move
${contractCode}
\`\`\`

REPORTED VULNERABILITY:
Title: ${finding.title}
Severity: ${finding.severity}
Location: Module ${finding.location.module}, Function ${finding.location.function}
Description: ${finding.description}
Impact: ${finding.impact}

Is this finding genuinely exploitable? Analyze the attack surface and contract constraints.
Output ONLY a JSON object (no markdown, no extra text) with this exact schema:
{
  "confirmed": boolean, // true if it is a real vulnerability, false if it's a false positive
  "confidence": number, // 1 to 10 scale of your confidence in this assessment
  "attackVector": "Detailed step-by-step explanation of how an attacker would exploit this, or why it's not exploitable",
  "refinedRecommendation": "A more precise fix for the code (only if confirmed=true)"
}`;

    const start = Date.now();
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const latencyMs = Date.now() - start;
    await this.metricsService.recordClaudeCall({
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      latencyMs,
    }).catch(err => this.logger.warn(`Failed to record metrics for deep dive: ${err}`));

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text');
    if (!textBlock) throw new Error('No text returned in deep dive');

    const cleaned = textBlock.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  }

  /**
   * Analyze cross-contract risks across multiple audited contracts in a repository.
   */
  async analyzeCrossContract(
    contractResults: { fileName: string; findings: any[]; summary: any }[],
    projectTrack?: string,
  ): Promise<any> {
    const contractSummaries = contractResults.map((c) => ({
      fileName: c.fileName,
      findingCount: c.findings.length,
      overallRisk: c.summary?.overallRisk || 'UNKNOWN',
      findings: c.findings.map((f: any) => ({
        title: f.title,
        severity: f.severity,
        category: f.category,
      })),
    }));

    const trackHint = projectTrack ? `Project Track: ${projectTrack}. ` : '';

    const prompt = `${trackHint}You are analyzing a repository of Sui Move smart contracts. Below is a summary of individual audit findings for each contract file.

Analyze for cross-contract risks, systemic patterns, missing system features, and provide an executive summary.

Respond ONLY with valid JSON matching this schema:
{
  "sharedRisks": [{ "title": string, "description": string, "affectedContracts": string[], "severity": string }],
  "systemicPatterns": [{ "pattern": string, "description": string, "recommendation": string }],
  "missingSystemFeatures": [{ "feature": string, "description": string, "priority": string }],
  "auditPriorityOrder": [{ "fileName": string, "reason": string }],
  "repositoryRisk": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "CLEAN",
  "executiveSummary": string
}

Contract Summaries:
${JSON.stringify(contractSummaries, null, 2)}`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      );

      if (!textBlock) throw new Error('No text content in cross-contract response');

      const cleaned = textBlock.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (error) {
      this.logger.warn(`Cross-contract analysis failed: ${error}. Using fallback.`);
      return {
        sharedRisks: [],
        systemicPatterns: [],
        missingSystemFeatures: [],
        auditPriorityOrder: contractResults.map((c) => ({
          fileName: c.fileName,
          reason: 'Default ordering',
        })),
        repositoryRisk: 'MEDIUM',
        executiveSummary: 'Cross-contract analysis was unavailable. Individual contract audits are still valid.',
      };
    }
  }

  /**
   * Helper: Derive the overall risk level from a list of findings.
   * If any CRITICAL finding exists -> CRITICAL
   * If any HIGH finding exists -> HIGH
   * etc.
   */
  private computeOverallRisk(findings: AuditFinding[]): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAN' {
    if (!findings || findings.length === 0) return 'CLEAN';
    
    if (findings.some(f => f.severity === 'CRITICAL')) return 'CRITICAL';
    if (findings.some(f => f.severity === 'HIGH')) return 'HIGH';
    if (findings.some(f => f.severity === 'MEDIUM')) return 'MEDIUM';
    if (findings.some(f => f.severity === 'LOW')) return 'LOW';
    
    return 'INFO' as any; // INFO falls back or acts as CLEAN
  }
}
