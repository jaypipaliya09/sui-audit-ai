/**
 * Hackathon-style audit tracks. The user picks one after connecting their
 * wallet; the choice is woven into the Claude prompt so the audit focuses on
 * the risks that matter most for that kind of project.
 */
export interface Track {
  value: string;
  title: string;
  description: string;
  /** Track-specific guidance appended to the auditor prompt. */
  focus: string;
}

export const TRACKS: Track[] = [
  {
    value: 'ai',
    title: 'AI',
    description: 'AI agents, AI-powered dApps, decentralized AI applications',
    focus:
      'Scrutinize oracle/model-output trust boundaries, agent authority and ' +
      'spending limits, prompt/parameter injection into on-chain actions, and ' +
      'replay of off-chain AI results.',
  },
  {
    value: 'defi',
    title: 'DeFi',
    description: 'DEX, lending, staking, yield, liquidity, trading protocols',
    focus:
      'Prioritize price-oracle manipulation, flash-loan and reentrancy-style ' +
      'attacks, rounding/precision loss, share-inflation, slippage, and ' +
      'liquidation/collateral accounting correctness.',
  },
  {
    value: 'infra',
    title: 'Infrastructure & Tooling',
    description: 'Developer tools, SDKs, IDE plugins, analytics, no-code tools',
    focus:
      'Focus on API/capability surface, input validation, privilege ' +
      'escalation through tooling, and safe defaults for downstream developers.',
  },
  {
    value: 'crypto',
    title: 'Cryptography',
    description: 'ZK, privacy, advanced cryptographic applications',
    focus:
      'Examine proof verification correctness, nonce/randomness handling, ' +
      'signature replay, commitment/nullifier schemes, and side-channel leaks ' +
      'of private inputs.',
  },
  {
    value: 'payments',
    title: 'Payments & Wallets',
    description: 'Wallet infrastructure, payments, merchant solutions',
    focus:
      'Prioritize asset-safety, double-spend and replay protection, key/auth ' +
      'handling, escrow/settlement correctness, and fee/amount arithmetic.',
  },
  {
    value: 'entertainment',
    title: 'Entertainment & Culture',
    description: 'Gaming, NFTs, media, sports, creator economy',
    focus:
      'Focus on randomness/fairness, NFT mint and ownership/royalty logic, ' +
      'marketplace escrow, and predictable in-game economy exploits.',
  },
  {
    value: 'storage',
    title: 'Programmable Storage',
    description: 'Apps built with Sui + Walrus storage capabilities',
    focus:
      'Examine blob/object reference integrity, access control on stored ' +
      'data, storage-cost griefing, and consistency between on-chain pointers ' +
      'and off-chain (Walrus) data.',
  },
  {
    value: 'explorations',
    title: 'Explorations',
    description: 'RWA, DePIN, multi-chain, experimental use cases',
    focus:
      'Focus on bridge/cross-chain message trust, real-world-asset ' +
      'tokenization and redemption invariants, and oracle/attestation trust.',
  },
  {
    value: 'degen',
    title: 'Degen',
    description: 'Memecoins, viral consumer apps, community-driven products',
    focus:
      'Prioritize rug-pull vectors (mint authority, hidden admin powers, ' +
      'freeze/blacklist), liquidity locks, tax/fee manipulation, and ' +
      'honeypot transfer restrictions.',
  },
];

export function findTrack(value: string): Track | undefined {
  return TRACKS.find((t) => t.value === value);
}
