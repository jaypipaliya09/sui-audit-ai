/**
 * Builds the user message sent to Claude alongside the system prompt.
 * Kept concise — the system prompt already contains all instructions.
 */
export function buildUserPrompt(
  contractCode: string,
  contractName: string,
): string {
  const lineCount = contractCode.split('\n').length;

  return `## Audit Request

**Contract Name:** ${contractName}
**Language:** Sui Move
**Approximate Lines:** ${lineCount}

Please perform a complete security audit of this Sui Move smart contract. Analyze all public/entry functions, object ownership patterns, coin/balance flows, and capability usage.

Respond ONLY with valid JSON matching the schema specified in your instructions. No markdown, no preamble, no explanation outside the JSON.

---BEGIN CONTRACT---
${contractCode}
---END CONTRACT---`;
}
