import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { fromBase64 } from '@mysten/sui/utils';
import { SUI_RPC_URL, getSecretKey } from '../config';

let client: SuiClient | null = null;

export function getSuiClient(): SuiClient {
  if (!client) client = new SuiClient({ url: SUI_RPC_URL });
  return client;
}

/**
 * Load the payer keypair the CLI uses to sign the escrow `lock` (and a
 * payer-initiated `refund` on rollback).
 *
 * Accepts either:
 *   - a bech32 `suiprivkey1...` secret key (Sui CLI / Slush export format), or
 *   - a base64-encoded 32-byte Ed25519 secret key.
 *
 * Read from ~/.move-auditor/config.json → secretKey (or MOVE_AUDITOR_SECRET_KEY
 * env var for dev). Returns null when not configured so the caller can fail
 * with a friendly message instead of throwing.
 */
export function loadPayerKeypair(): Ed25519Keypair | null {
  const raw = getSecretKey()?.trim();
  if (!raw) return null;

  try {
    if (raw.startsWith('suiprivkey')) {
      const { secretKey } = decodeSuiPrivateKey(raw);
      return Ed25519Keypair.fromSecretKey(secretKey);
    }
    return Ed25519Keypair.fromSecretKey(fromBase64(raw));
  } catch (error) {
    throw new Error(
      `Secret key is set but could not be parsed: ${
        error instanceof Error ? error.message : error
      }. Run \`move-auditor setup\` to reconfigure.`,
    );
  }
}
