import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

/** Price charged per .move file audited, in SUI. Override with PRICE_PER_FILE_SUI. */
export const PRICE_PER_FILE_SUI = Number(process.env.PRICE_PER_FILE_SUI ?? 1);

/**
 * The coin type used for payment. Defaults to SUI.
 * Override with SUI_COIN_TYPE for a different network/asset.
 */
export const SUI_COIN_TYPE =
  process.env.SUI_COIN_TYPE ??
  '0x2::sui::SUI';

/** SUI has 9 decimals (1 SUI = 1e9 base units). */
export const SUI_DECIMALS = Number(process.env.SUI_DECIMALS ?? 9);

/** Target Sui network. Testnet first (see PACKAGE_PLAN.md). */
export const NETWORK = (process.env.SUI_NETWORK ?? 'testnet') as
  | 'testnet'
  | 'mainnet'
  | 'devnet';

export const SUI_RPC_URL =
  process.env.SUI_RPC_URL ?? `https://fullnode.${NETWORK}.sui.io:443`;

/** Deployed `move_auditor` package id holding the escrow module. */
export const ESCROW_PACKAGE_ID = process.env.ESCROW_PACKAGE_ID ?? '';

/** Treasury address that receives captured (deposited) funds. */
export const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS ?? '';

/** Base URL of the Slush API used to validate wallet ids. */
export const SLUSH_API_URL = process.env.SLUSH_API_URL ?? '';
export const SLUSH_API_KEY = process.env.SLUSH_API_KEY ?? '';

/** Backend URL where audit runs are uploaded for the per-user report UI. */
export const BACKEND_URL = process.env.BACKEND_URL ?? '';

/** Web app URL where the user views their reports (the user-side dashboard). */
export const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

const CONFIG_DIR = join(homedir(), '.move-auditor');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface PersistedConfig {
  /** Last validated Slush wallet address. */
  walletAddress?: string;
  /**
   * A still-open escrow that was not captured or refunded (e.g. the process
   * crashed). Used for crash recovery on the next launch.
   */
  pendingHold?: {
    escrowId: string;
    amountSui: number;
    createdAt: string;
  };
}

export function loadConfig(): PersistedConfig {
  try {
    if (!existsSync(CONFIG_FILE)) return {};
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as PersistedConfig;
  } catch {
    return {};
  }
}

export function saveConfig(config: PersistedConfig): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/** Convert a SUI amount to its on-chain base units (SUI has 9 decimals). */
export function suiToBaseUnits(sui: number): bigint {
  return BigInt(Math.round(sui * 10 ** SUI_DECIMALS));
}

/** Convert on-chain SUI base units back to a decimal SUI amount. */
export function baseUnitsToSui(base: bigint): number {
  return Number(base) / 10 ** SUI_DECIMALS;
}
