import { isValidSuiAddress } from '@mysten/sui/utils';
import { getSuiClient } from '../sui/client';
import {
  SLUSH_API_URL,
  SLUSH_API_KEY,
  SUI_COIN_TYPE,
  baseUnitsToSui,
} from '../config';

export interface WalletInfo {
  address: string;
  balanceSui: number;
  valid: boolean;
}

/**
 * Validates a Slush wallet id and returns its SUI balance.
 *
 * Strategy:
 *   1. Local format check (Sui address = 0x + 64 hex).
 *   2. If SLUSH_API_URL is configured, confirm the account via the Slush API.
 *   3. Confirm on-chain reality + balance via the Sui fullnode RPC (always).
 *
 * The Slush API shape is configurable; adjust `verifyWithSlush` to match the
 * official Slush API contract once available. RPC is the source of truth for
 * the spendable balance regardless.
 */
export class SlushWalletService {
  async validate(address: string): Promise<WalletInfo> {
    const trimmed = address.trim();

    if (!isValidSuiAddress(trimmed)) {
      return { address: trimmed, balanceSui: 0, valid: false };
    }

    if (SLUSH_API_URL) {
      const ok = await this.verifyWithSlush(trimmed);
      if (!ok) return { address: trimmed, balanceSui: 0, valid: false };
    }

    const balanceSui = await this.getSuiBalance(trimmed);
    return { address: trimmed, balanceSui, valid: true };
  }

  private async getSuiBalance(address: string): Promise<number> {
    const client = getSuiClient();
    const { totalBalance } = await client.getBalance({
      owner: address,
      coinType: SUI_COIN_TYPE,
    });
    return baseUnitsToSui(BigInt(totalBalance));
  }

  /**
   * Confirm the wallet exists via the Slush API. Returns true when the API
   * reports a known/active account. Network failures throw so the caller can
   * surface "Slush unreachable" rather than silently passing.
   */
  private async verifyWithSlush(address: string): Promise<boolean> {
    const url = `${SLUSH_API_URL.replace(/\/$/, '')}/accounts/${address}`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (SLUSH_API_KEY) headers.Authorization = `Bearer ${SLUSH_API_KEY}`;

    const res = await fetch(url, { headers });
    if (res.status === 404) return false;
    if (!res.ok) {
      throw new Error(`Slush API error ${res.status}: ${await res.text()}`);
    }
    return true;
  }
}
