/**
 * Canonical track list — mirrors apps/cli/src/audit/tracks.ts exactly.
 * The `id` values are the API's projectTrack keys (uppercase CLI value).
 */
export interface WebTrack {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const TRACKS: WebTrack[] = [
  {
    id: 'AI',
    label: 'AI',
    emoji: '🤖',
    description: 'AI agents, AI-powered dApps, decentralized AI applications',
  },
  {
    id: 'DEFI',
    label: 'DeFi',
    emoji: '💰',
    description: 'DEX, lending, staking, yield, liquidity, trading protocols',
  },
  {
    id: 'INFRA',
    label: 'Infrastructure & Tooling',
    emoji: '🛠️',
    description: 'Developer tools, SDKs, IDE plugins, analytics, no-code tools',
  },
  {
    id: 'CRYPTO',
    label: 'Cryptography',
    emoji: '🔐',
    description: 'ZK, privacy, advanced cryptographic applications',
  },
  {
    id: 'PAYMENTS',
    label: 'Payments & Wallets',
    emoji: '💳',
    description: 'Wallet infrastructure, payments, merchant solutions',
  },
  {
    id: 'ENTERTAINMENT',
    label: 'Entertainment & Culture',
    emoji: '🎮',
    description: 'Gaming, NFTs, media, sports, creator economy',
  },
  {
    id: 'STORAGE',
    label: 'Programmable Storage',
    emoji: '🌊',
    description: 'Apps built with Sui + Walrus storage capabilities',
  },
  {
    id: 'EXPLORATIONS',
    label: 'Explorations',
    emoji: '🔭',
    description: 'RWA, DePIN, multi-chain, experimental use cases',
  },
  {
    id: 'DEGEN',
    label: 'Degen',
    emoji: '🚀',
    description: 'Memecoins, viral consumer apps, community-driven products',
  },
];
