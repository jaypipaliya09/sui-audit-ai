/**
 * Track-specific context injected into the audit prompt when a projectTrack is specified.
 * IDs match the CLI track values (uppercase).
 */
const TRACK_CONTEXT: Record<string, string> = {
  AI: `FOCUS AREAS for AI track (AI agents, AI-powered dApps, decentralized AI applications):
- Oracle/model-output trust boundaries and parameter integrity
- Agent authority limits and spending caps
- Prompt/parameter injection into on-chain actions
- Replay of off-chain AI results
- Reward manipulation vectors and training data poisoning`,

  DEFI: `FOCUS AREAS for DeFi track (DEX, lending, staking, yield, liquidity, trading):
- Flash loan attack vectors and sandwich attacks
- Oracle manipulation and price feed validation
- Reentrancy and cross-function reentrancy
- Integer overflow/underflow and rounding/precision loss in financial calculations
- Share-inflation, slippage, and frontrunning protection
- Liquidation and collateral accounting correctness`,

  INFRA: `FOCUS AREAS for Infrastructure & Tooling track (SDKs, developer tools, analytics):
- API/capability surface and privilege escalation through tooling
- Input validation and safe defaults for downstream developers
- Unauthorized access to admin or configuration functions
- Dependency and upgrade path security`,

  CRYPTO: `FOCUS AREAS for Cryptography track (ZK, privacy, advanced cryptographic applications):
- Proof verification correctness and soundness
- Nonce/randomness handling and uniqueness
- Signature replay and malleability
- Commitment and nullifier scheme integrity
- Side-channel leaks of private inputs`,

  PAYMENTS: `FOCUS AREAS for Payments & Wallets track (wallet infrastructure, payments, merchant solutions):
- Double-spend and replay protection
- Integer overflow in payment and fee calculations
- Recipient validation and address verification
- Escrow and settlement correctness
- Key/auth handling and custody risks`,

  ENTERTAINMENT: `FOCUS AREAS for Entertainment & Culture track (gaming, NFTs, media, creator economy):
- Randomness fairness and predictability exploits
- NFT mint authority, ownership, and royalty logic
- Marketplace escrow and fee bypass vectors
- Game state manipulation and reward distribution fairness
- Creator economy economic exploits`,

  STORAGE: `FOCUS AREAS for Programmable Storage track (Sui + Walrus storage applications):
- Blob/object reference integrity and on-chain pointer consistency
- Access control on stored data
- Storage-cost griefing and denial-of-service
- Consistency between on-chain state and off-chain Walrus data`,

  EXPLORATIONS: `FOCUS AREAS for Explorations track (RWA, DePIN, multi-chain, experimental):
- Bridge and cross-chain message trust and replay
- Real-world-asset tokenization and redemption invariants
- Oracle and attestation trust for off-chain data
- Multi-chain state consistency risks`,

  DEGEN: `FOCUS AREAS for Degen track (memecoins, viral consumer apps, community products):
- Rug-pull vectors: mint authority, hidden admin powers, freeze/blacklist capabilities
- Liquidity lock bypass and honeypot transfer restrictions
- Tax/fee manipulation and hidden exit mechanics
- Privileged wallet concentration risks`,
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
