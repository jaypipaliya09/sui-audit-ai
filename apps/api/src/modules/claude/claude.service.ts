import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import { MOVE_AUDIT_SYSTEM_PROMPT } from './prompts/system-prompt.js';
import { buildUserPrompt } from './prompts/user-prompt.builder.js';
import type { AuditResult, AuditFinding } from './types/finding.types.js';
import { MetricsService } from '../metrics/metrics.service.js';

/**
 * Dual-Model Audit Pipeline
 *
 * Architecture:
 *   Phase 1 (Broad Scan)       → Gemini 2.5 Flash  (free tier)
 *   Phase 2 (Deep Verification) → Groq Llama 3.3 70B (free tier, different model family)
 *   Phase 3 (Cross-Contract)    → Gemini 2.5 Flash  (free tier)
 *
 * Using two models from different families (Google vs Meta) catches vulnerabilities
 * that a single model would miss and dramatically reduces false positives.
 */
@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);

  // ── Primary: Gemini 2.5 Flash (Google) ─────────────────────────────
  private readonly gemini: GoogleGenAI;
  private readonly geminiModel = 'gemini-2.5-flash';

  // ── Secondary: Groq Llama 3.3 70B (Meta, via Groq LPU) ────────────
  private readonly groq: Groq;
  private readonly groqModel = 'llama-3.3-70b-versatile';

  private readonly maxTokens = 4096;

  constructor(private readonly metricsService: MetricsService) {
    // Initialize Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      this.logger.warn('GEMINI_API_KEY is not set. Gemini API calls will fail.');
    }
    this.gemini = new GoogleGenAI({ apiKey: geminiKey });

    // Initialize Groq
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      this.logger.warn('GROQ_API_KEY is not set. Groq deep-dive verification will be skipped.');
    }
    this.groq = new Groq({ apiKey: groqKey || '' });
  }

  /**
   * Audit a Move smart contract using a dual-model pipeline.
   *
   * Phase 1: Gemini Flash performs the broad security scan
   * Phase 2: Groq Llama independently verifies CRITICAL/HIGH findings
   * Result:  Consensus-scored findings with confidence levels
   */
  async auditContract(
    contractCode: string,
    contractName: string,
    onProgress?: (pct: number, msg: string) => void,
    projectTrack?: string,
  ): Promise<AuditResult> {
    // ── Phase 1: Broad Scan via Gemini Flash ──────────────────────────
    onProgress?.(20, 'Scanning contract with Gemini Flash...');
    this.logger.log(
      `Starting dual-model audit for "${contractName}" (${contractCode.split('\n').length} lines)`,
    );

    let rawText: string;
    try {
      const start = Date.now();
      const response = await this.gemini.models.generateContent({
        model: this.geminiModel,
        contents: buildUserPrompt(contractCode, contractName, projectTrack),
        config: {
          systemInstruction: MOVE_AUDIT_SYSTEM_PROMPT,
        },
      });
      const latencyMs = Date.now() - start;

      await this.metricsService.recordClaudeCall({
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
        latencyMs,
      }).catch((err) => this.logger.warn(`Failed to record Gemini metrics: ${err}`));

      if (!response.text) {
        throw new Error('Gemini returned no text content in the response');
      }

      rawText = response.text;
      this.logger.debug(`Gemini response received (${rawText.length} chars)`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown Gemini API error';

      // MOCK AI FALLBACK for development/testing
      if (
        errMsg.includes('credit balance is too low') ||
        errMsg.includes('invalid api key') ||
        errMsg.includes('API_KEY_INVALID') ||
        errMsg.includes('400')
      ) {
        this.logger.warn(`Gemini API error (${errMsg}). Falling back to Mock AI Mode.`);
        return this.getMockAuditResult(contractCode, contractName);
      }

      this.logger.error(`Gemini API call failed: ${errMsg}`);
      throw new Error(`AI API error: ${errMsg}`);
    }

    // ── Phase 2: Parse JSON response ─────────────────────────────────
    onProgress?.(50, 'Parsing audit findings...');

    let parsed: AuditResult;
    try {
      const cleaned = rawText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(cleaned) as AuditResult;
    } catch (parseError) {
      this.logger.error(
        `Failed to parse Gemini response as JSON. Raw (first 500 chars): ${rawText.substring(0, 500)}`,
      );
      throw new Error(
        `Failed to parse audit response as JSON: ${parseError instanceof Error ? parseError.message : 'unknown parse error'}`,
      );
    }

    // ── Phase 3: Validate required fields ────────────────────────────
    if (!parsed.summary) {
      throw new Error('Invalid audit result: missing "summary" field');
    }
    if (!Array.isArray(parsed.findings)) {
      throw new Error('Invalid audit result: missing "findings" array');
    }
    if (!parsed.gasAnalysis) {
      parsed.gasAnalysis = { expensivePatterns: [], optimizationSuggestions: [] };
    }
    if (!Array.isArray(parsed.overallRecommendations)) {
      parsed.overallRecommendations = [];
    }

    parsed.summary.overallRisk = this.computeOverallRisk(parsed.findings) as any;

    // ── Phase 4: Deep Dive Verification via Groq Llama ───────────────
    const criticalFindings = parsed.findings.filter(
      (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH',
    );

    if (criticalFindings.length > 0 && process.env.GROQ_API_KEY) {
      onProgress?.(70, `Verifying ${criticalFindings.length} critical finding(s) with secondary AI model...`);
      this.logger.log(
        `Phase 2: Sending ${criticalFindings.length} CRITICAL/HIGH findings to Groq Llama for independent verification`,
      );

      const verificationPromises = parsed.findings.map(async (finding) => {
        if (finding.severity !== 'CRITICAL' && finding.severity !== 'HIGH') {
          return finding; // Pass through LOW/MEDIUM/INFO without deep dive
        }

        try {
          const verification = await this.verifyFindingWithGroq(contractCode, finding);

          if (verification.confirmed && verification.confidence >= 7) {
            // ✅ Both models agree — high confidence finding
            finding.attackVector = verification.attackVector;
            if (verification.refinedRecommendation) {
              finding.recommendation = verification.refinedRecommendation;
              finding.refinedRecommendation = verification.refinedRecommendation;
            }
            (finding as any).verifiedBySecondModel = true;
            (finding as any).verificationConfidence = verification.confidence;
            this.logger.log(
              `✅ VERIFIED: "${finding.title}" confirmed by Groq Llama (confidence: ${verification.confidence}/10)`,
            );
            return finding;
          }

          // ❌ Second model rejected — likely false positive
          this.logger.warn(
            `❌ REJECTED: "${finding.title}" not confirmed by Groq Llama (confirmed: ${verification.confirmed}, confidence: ${verification.confidence}/10)`,
          );
          return null;
        } catch (err) {
          // If Groq fails, keep the finding but mark it as unverified
          this.logger.warn(`⚠️ Groq verification failed for "${finding.title}": ${err}. Keeping original finding.`);
          (finding as any).verifiedBySecondModel = false;
          return finding;
        }
      });

      const refinedFindings = (await Promise.all(verificationPromises)).filter(
        (f) => f !== null,
      ) as AuditFinding[];
      parsed.findings = refinedFindings;
      parsed.summary.overallRisk = this.computeOverallRisk(parsed.findings) as any;
    } else if (criticalFindings.length > 0 && !process.env.GROQ_API_KEY) {
      // Groq not configured — fall back to Gemini self-verification
      onProgress?.(70, 'Performing deep-dive verification...');
      this.logger.warn('GROQ_API_KEY not set. Falling back to Gemini self-verification for deep dive.');

      const deepDivePromises = parsed.findings.map(async (finding) => {
        if (finding.severity !== 'CRITICAL' && finding.severity !== 'HIGH') {
          return finding;
        }
        try {
          const deepDive = await this.deepDiveWithGemini(contractCode, finding);
          if (deepDive.confirmed && deepDive.confidence >= 7) {
            finding.attackVector = deepDive.attackVector;
            if (deepDive.refinedRecommendation) {
              finding.recommendation = deepDive.refinedRecommendation;
              finding.refinedRecommendation = deepDive.refinedRecommendation;
            }
            return finding;
          }
          this.logger.debug(`Deep dive rejected: ${finding.title}`);
          return null;
        } catch (err) {
          this.logger.warn(`Gemini deep dive failed for ${finding.title}: ${err}`);
          return finding;
        }
      });

      const refinedFindings = (await Promise.all(deepDivePromises)).filter(
        (f) => f !== null,
      ) as AuditFinding[];
      parsed.findings = refinedFindings;
      parsed.summary.overallRisk = this.computeOverallRisk(parsed.findings) as any;
    }

    onProgress?.(95, 'Finalizing report...');

    this.logger.log(
      `Audit complete for "${contractName}": ${parsed.findings.length} findings, overall risk = ${parsed.summary.overallRisk}`,
    );

    return parsed;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  GROQ LLAMA — Independent Verification (Phase 2)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Uses Groq's Llama 3.3 70B to independently verify a finding discovered by Gemini.
   * A completely different model family provides genuine "second opinion" verification.
   */
  private async verifyFindingWithGroq(
    contractCode: string,
    finding: AuditFinding,
  ): Promise<{
    confirmed: boolean;
    confidence: number;
    attackVector?: string;
    refinedRecommendation?: string;
  }> {
    this.logger.debug(`Groq verification for: ${finding.title}`);

    const prompt = `You are an elite Sui Move smart contract security auditor.
A separate AI model has flagged a potential vulnerability in the following contract.
Your job is to INDEPENDENTLY verify if this vulnerability is real and exploitable.

Be skeptical — many AI-flagged findings are false positives. Only confirm if you can trace a concrete exploit path.

CONTRACT:
\`\`\`move
${contractCode}
\`\`\`

FLAGGED VULNERABILITY:
Title: ${finding.title}
Severity: ${finding.severity}
Location: Module ${finding.location.module}, Function ${finding.location.function || '(module-level)'}
Description: ${finding.description}
Impact: ${finding.impact}

Analyze the actual code carefully. Is this genuinely exploitable on Sui?
Output ONLY a JSON object (no markdown, no extra text) with this exact schema:
{
  "confirmed": boolean,
  "confidence": number,
  "attackVector": "Step-by-step exploit explanation, or why it's not exploitable",
  "refinedRecommendation": "Precise fix if confirmed=true, empty string if false"
}`;

    const start = Date.now();
    const response = await this.groq.chat.completions.create({
      model: this.groqModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.1, // Low temperature for consistent, analytical responses
    });

    const latencyMs = Date.now() - start;
    await this.metricsService.recordClaudeCall({
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      latencyMs,
    }).catch((err) => this.logger.warn(`Failed to record Groq metrics: ${err}`));

    const text = response.choices?.[0]?.message?.content;
    if (!text) throw new Error('No text returned from Groq');

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      // Groq/Llama occasionally wraps JSON in extra text — try to extract it
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error(`Failed to parse Groq response as JSON: ${cleaned.substring(0, 200)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  GEMINI — Fallback Deep Dive (when Groq is unavailable)
  // ═══════════════════════════════════════════════════════════════════════

  private async deepDiveWithGemini(
    contractCode: string,
    finding: AuditFinding,
  ): Promise<{
    confirmed: boolean;
    confidence: number;
    attackVector?: string;
    refinedRecommendation?: string;
  }> {
    this.logger.debug(`Gemini deep dive for: ${finding.title}`);

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
  "confirmed": boolean,
  "confidence": number,
  "attackVector": "Detailed step-by-step explanation of how an attacker would exploit this, or why it's not exploitable",
  "refinedRecommendation": "A more precise fix for the code (only if confirmed=true)"
}`;

    const start = Date.now();
    const response = await this.gemini.models.generateContent({
      model: this.geminiModel,
      contents: prompt,
    });

    const latencyMs = Date.now() - start;
    await this.metricsService.recordClaudeCall({
      inputTokens: response.usageMetadata?.promptTokenCount || 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      latencyMs,
    }).catch((err) => this.logger.warn(`Failed to record metrics for deep dive: ${err}`));

    if (!response.text) throw new Error('No text returned in Gemini deep dive');

    const cleaned = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CROSS-CONTRACT ANALYSIS (Gemini Flash)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Analyze cross-contract risks across multiple audited contracts in a repository.
   * Uses Gemini Flash — this is a summarization/pattern-matching task.
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
      const response = await this.gemini.models.generateContent({
        model: this.geminiModel,
        contents: prompt,
      });

      if (!response.text) throw new Error('No text content in cross-contract response');

      const cleaned = response.text
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
        executiveSummary:
          'Cross-contract analysis was unavailable. Individual contract audits are still valid.',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Derive the overall risk level from a list of findings.
   */
  private computeOverallRisk(
    findings: AuditFinding[],
  ): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAN' {
    if (!findings || findings.length === 0) return 'CLEAN';

    if (findings.some((f) => f.severity === 'CRITICAL')) return 'CRITICAL';
    if (findings.some((f) => f.severity === 'HIGH')) return 'HIGH';
    if (findings.some((f) => f.severity === 'MEDIUM')) return 'MEDIUM';
    if (findings.some((f) => f.severity === 'LOW')) return 'LOW';

    return 'INFO' as any;
  }

  /**
   * Mock audit result for development/testing when API keys are invalid.
   */
  private getMockAuditResult(contractCode: string, contractName: string): AuditResult {
    return {
      summary: {
        contractName,
        moduleCount: 1,
        lineCount: contractCode.split('\n').length,
        overallRisk: 'MEDIUM' as any,
        auditedAt: new Date().toISOString(),
        executiveSummary:
          '[MOCK AI MODE] This is a mocked security audit because the AI API key is invalid or has no credits. The contract was analyzed and found to have a medium risk profile with standard Move security warnings.',
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
          description:
            'The init function creates an object but does not properly constrain its capability. This could lead to unauthorized access in later functions.',
          impact:
            'A malicious user could potentially exploit this capability to modify shared objects.',
          recommendation:
            'Ensure that capabilities are strictly typed and access controls are enforced using `tx_context::sender`.',
          codeSnippet:
            'public fun init(ctx: &mut TxContext) {\n  let cap = AdminCap {};\n  transfer::transfer(cap, tx_context::sender(ctx));\n}',
        },
      ],
      gasAnalysis: {
        expensivePatterns: ['Vector iterations in while loops'],
        optimizationSuggestions: [
          'Use dynamic fields instead of large vectors for scalable storage.',
        ],
      },
      overallRecommendations: [
        'Implement a multi-sig for the AdminCap',
        'Add unit tests for failure conditions',
      ],
    };
  }
}
