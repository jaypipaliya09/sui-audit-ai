/**
 * Builds the user message sent to Claude alongside the system prompt.
 * Kept concise — the system prompt already contains all instructions.
 */
export function buildUserPrompt(
  contractCode: string,
  contractName: string,
  track?: string,
): string {
  const lineCount = contractCode.split('\n').length;

  let trackInstructions = '';
  if (track && track !== 'General') {
    trackInstructions = `\n**Audit Track:** ${track}\n`;
    
    // Track-specific focuses
    const trackFocusMap: Record<string, string> = {
      'DeFi': 'Focus specifically on Liquidity Pools, AMMs, DEX Logic, Yield Strategies, Vaults, and Treasury Management.',
      'DeepBook': 'Focus specifically on DeepBook Integrations, Order Book Logic, Market/Limit Orders, Liquidity Management, and Trading Infrastructure.',
      'DEX': 'Focus specifically on Cetus/Kriya/Turbos integrations, Swap Logic, Router Logic, and Trading Pools.',
      'Lending': 'Focus specifically on Scallop/NAVI/Suilend integrations, Borrowing/Lending Logic, Interest Calculations, and Liquidation Logic.',
      'NFT': 'Focus specifically on NFT Collections, Minting, Marketplace Contracts, Royalty Logic, and Transfer Logic.',
      'Staking': 'Focus specifically on Validator Staking, Liquid Staking, Reward Distribution, and Delegation Logic.',
      'Stablecoin': 'Focus specifically on CDP Systems, Stablecoin Minting, Collateral Logic, and Peg Maintenance.',
      'DAO': 'Focus specifically on Governance Contracts, Voting Logic, Proposal Systems, and Treasury Governance.',
      'Aggregator': 'Focus specifically on Routing Logic, Multi-Protocol Execution, and Liquidity Aggregation.',
      'Bridge': 'Focus specifically on Cross-chain Messaging, Asset Bridging, Lock/Mint Logic, and Burn/Release Logic.',
    };

    if (trackFocusMap[track]) {
      trackInstructions += `**Track Instructions:** ${trackFocusMap[track]}\n`;
    }
  }

  return `## Audit Request

**Contract Name:** ${contractName}
**Language:** Sui Move
**Approximate Lines:** ${lineCount}${trackInstructions}

Please perform a complete security audit of this Sui Move smart contract. Analyze all public/entry functions, object ownership patterns, coin/balance flows, and capability usage.

Respond ONLY with valid JSON matching the schema specified in your instructions. No markdown, no preamble, no explanation outside the JSON.

---BEGIN CONTRACT---
${contractCode}
---END CONTRACT---`;
}
