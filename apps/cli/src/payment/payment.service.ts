/** A reservation of blocked funds, returned by `hold` and used to roll back. */
export interface HoldId {
  escrowId: string;
  amountSui: number;
  txDigest: string;
}

export interface TxResult {
  txDigest: string;
}

/**
 * Block -> deposit / refund primitive used by the audit flow.
 *
 *   hold(amount)   blocks funds  (user confirmed "yes")
 *   capture(hold)  deposits them (audit completed successfully)
 *   release(hold)  refunds them  (audit failed or was interrupted)
 *
 * Implementations must make `capture` and `release` idempotent / retry-safe.
 */
export interface PaymentService {
  hold(amountSui: number): Promise<HoldId>;
  capture(hold: HoldId): Promise<TxResult>;
  release(hold: HoldId): Promise<TxResult>;
}
