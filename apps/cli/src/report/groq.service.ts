import Groq from 'groq-sdk';
import chalk from 'chalk';
import { AuditResult } from '../auditor/claude-cli.service';

export class GroqReportService {
  private groq: Groq;

  constructor() {
    // Requires GROQ_API_KEY environment variable to be set
    this.groq = new Groq();
  }

  /**
   * Generates a beautifully formatted Markdown report using Groq
   */
  async generateMarkdownReport(auditResult: AuditResult): Promise<string> {
    console.log(chalk.blue(`Generating comprehensive report with Groq...`));

    const prompt = `You are a professional security report generator. 
I will provide you with the raw JSON findings from a smart contract security audit.
Your job is to generate a comprehensive, highly professional Markdown report.

The report should include:
1. An Executive Summary
2. Overall Risk Assessment
3. Detailed Findings (grouped by severity)
4. Recommendations and Next Steps

Raw Audit JSON:
${JSON.stringify(auditResult, null, 2)}

Please output ONLY the Markdown text. Do not include introductory text like "Here is the report".`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 4096,
      });

      return completion.choices[0]?.message?.content || 'Error: Empty response from Groq';
    } catch (error) {
      console.error(chalk.red('Failed to generate report with Groq.'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      }
      throw error;
    }
  }
}
