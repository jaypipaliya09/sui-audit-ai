import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getSuiClient } from '../sui/client';
import {
  ESCROW_PACKAGE_ID,
  TREASURY_ADDRESS,
  SUI_COIN_TYPE,
  suiToBaseUnits,
} from '../config';
import { HoldId, PaymentService, TxResult } from './payment.service';

const ESCROW_MODULE = 'escrow';

/**
 * On-chain escrow implementation (Model A).
 *
 *   hold    -> payer signs `escrow::lock`, blocking funds in a shared object.
 *   capture -> authority (treasury) signs `escrow::capture`, depositing funds.
 *   release -> payer signs `escrow::refund`, returning funds (offline rollback).
 *
 * The payer key signs `lock` and `refund` (so Ctrl+C rollback works without a
 * backend). `capture` needs the treasury key: either configured locally
 * (TREASURY_SECRET_KEY, dev/operator on testnet) or finalized via the backend.
 */
export class EscrowPaymentService implements PaymentService {
  constructor(private readonly payer: Ed25519Keypair) {
    if (!ESCROW_PACKAGE_ID) {
      throw new Error('ESCROW_PACKAGE_ID is not set (deploy the contract first).');
    }
    if (!TREASURY_ADDRESS) {
      throw new Error('TREASURY_ADDRESS is not set.');
    }
  }

  async hold(amountSui: number): Promise<HoldId> {
    const client = getSuiClient();
    const tx = new Transaction();

    // For native SUI, split from the gas coin to avoid InsufficientCoinBalance errors.
    // For other coins, use coinWithBalance to resolve the required amount.
    const isSui = SUI_COIN_TYPE === '0x2::sui::SUI' || SUI_COIN_TYPE.endsWith('::sui::SUI');
    const paymentAmount = suiToBaseUnits(amountSui);
    
    const payment = isSui
      ? tx.splitCoins(tx.gas, [paymentAmount])[0]
      : coinWithBalance({
          type: SUI_COIN_TYPE,
          balance: paymentAmount,
        });

    tx.moveCall({
      target: `${ESCROW_PACKAGE_ID}::${ESCROW_MODULE}::lock`,
      typeArguments: [SUI_COIN_TYPE],
      arguments: [payment, tx.pure.address(TREASURY_ADDRESS)],
    });

    const result = await client.signAndExecuteTransaction({
      signer: this.payer,
      transaction: tx,
      options: { showObjectChanges: true, showEffects: true },
    });
    this.assertSuccess(result);
    // Ensure the node has indexed the new shared object before we read it.
    await client.waitForTransaction({ digest: result.digest });

    const created = result.objectChanges?.find(
      (c) =>
        c.type === 'created' &&
        c.objectType.includes(`::${ESCROW_MODULE}::AuditEscrow`),
    );
    if (!created || created.type !== 'created') {
      throw new Error('Escrow object was not created by lock transaction.');
    }

    return {
      escrowId: created.objectId,
      amountSui,
      txDigest: result.digest,
    };
  }

  async release(hold: HoldId): Promise<TxResult> {
    // Payer-initiated refund — always available for rollback.
    return this.finalize(hold, 'refund', this.payer);
  }

  async capture(hold: HoldId): Promise<TxResult> {
    // The payer signs capture; funds go to the recorded treasury (authority).
    // The treasury never needs a private key on the user's machine.
    return this.finalize(hold, 'capture', this.payer);
  }

  /** Build and submit a `capture` / `refund` call against an existing escrow. */
  private async finalize(
    hold: HoldId,
    fn: 'capture' | 'refund',
    signer: Ed25519Keypair,
  ): Promise<TxResult> {
    const client = getSuiClient();
    const ref = await this.sharedEscrowRef(hold.escrowId);

    const tx = new Transaction();
    tx.moveCall({
      target: `${ESCROW_PACKAGE_ID}::${ESCROW_MODULE}::${fn}`,
      typeArguments: [SUI_COIN_TYPE],
      arguments: [tx.sharedObjectRef(ref)],
    });

    const result = await client.signAndExecuteTransaction({
      signer,
      transaction: tx,
      options: { showEffects: true },
    });
    this.assertSuccess(result);
    return { txDigest: result.digest };
  }

  private async sharedEscrowRef(escrowId: string) {
    const client = getSuiClient();
    // Retry to tolerate fullnode read-after-write lag.
    let owner: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const obj = await client.getObject({ id: escrowId, options: { showOwner: true } });
      owner = obj.data?.owner;
      if (owner && typeof owner === 'object' && 'Shared' in owner) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!owner || typeof owner !== 'object' || !('Shared' in owner)) {
      throw new Error(`Escrow ${escrowId} is not a shared object (already finalized?).`);
    }
    return {
      objectId: escrowId,
      initialSharedVersion: owner.Shared.initial_shared_version,
      mutable: true,
    };
  }

  private assertSuccess(result: { effects?: { status?: { status: string; error?: string } } | null }) {
    const status = result.effects?.status;
    if (status && status.status !== 'success') {
      throw new Error(`Transaction failed: ${status.error ?? 'unknown error'}`);
    }
  }
}
