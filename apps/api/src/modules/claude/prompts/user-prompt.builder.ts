/**
 * Track-specific context injected into the audit prompt when a projectTrack is specified.
 */
const TRACK_CONTEXT: Record<string, string> = {
  INSTITUTIONS_CAPITAL_MARKETS: `FOCUS AREAS for Institutional/Capital Markets track:
- Compliance controls and regulatory event emissions
- Multi-signature and governance patterns
- Access control for privileged operations
- Audit trail completeness and event emission coverage
- KYC/AML related state management`,

  AI: `FOCUS AREAS for AI track:
- Model update access control and parameter integrity
- Reward manipulation vectors
- Oracle/data feed validation
- Weight/parameter overflow checks
- Training data poisoning via on-chain state`,

  DEFI: `FOCUS AREAS for DeFi track:
- Flash loan attack vectors
- Oracle manipulation and price feed validation
- Reentrancy and cross-function reentrancy
- Integer overflow/underflow in financial calculations
- Liquidity pool manipulation and sandwich attacks
- Slippage and frontrunning protection`,

  GAMING: `FOCUS AREAS for Gaming track:
- Randomness manipulation and predictability
- NFT metadata integrity and unauthorized modifications
- Marketplace fee bypass vectors
- Game state manipulation
- Reward/loot distribution fairness`,

  PAYMENTS: `FOCUS AREAS for Payments track:
- Double-spend prevention
- Integer overflow in payment calculations
- Recipient validation and address verification
- Fee calculation accuracy
- Payment routing and escrow security`,
};

/**
 * Builds the user message sent to Claude alongside the system prompt.
 * Kept concise — the system prompt already contains all instructions.
 */
export function buildUserPrompt(
  contractCode: string,
  contractName: string,
  projectTrack?: string,
): string {
  const lineCount = contractCode.split('\n').length;

  let trackContext = '';
  if (projectTrack && TRACK_CONTEXT[projectTrack]) {
    trackContext = `\n\n${TRACK_CONTEXT[projectTrack]}\n`;
  }

  return `## Audit Request

**Contract Name:** ${contractName}
**Language:** Sui Move
**Approximate Lines:** ${lineCount}
${trackContext}
Please perform a complete security audit of this Sui Move smart contract. Analyze all public/entry functions, object ownership patterns, coin/balance flows, and capability usage.

Respond ONLY with valid JSON matching the schema specified in your instructions. No markdown, no preamble, no explanation outside the JSON.

---BEGIN CONTRACT---
${contractCode}
---END CONTRACT---`;
}
