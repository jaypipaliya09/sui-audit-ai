import chalk from 'chalk';
import { HoldId, PaymentService, TxResult } from './payment.service';

/**
 * In-memory PaymentService for testing the audit flow without a deployed
 * escrow contract or real funds. Enable with MOVE_AUDITOR_MOCK_PAYMENT=1.
 */
export class MockPaymentService implements PaymentService {
  async hold(amountSui: number): Promise<HoldId> {
    const escrowId = `0xmock${Date.now().toString(16)}`;
    console.log(chalk.gray(`[mock] blocked ${amountSui} SUI -> ${escrowId}`));
    return { escrowId, amountSui, txDigest: 'mock-lock' };
  }

  async capture(hold: HoldId): Promise<TxResult> {
    console.log(chalk.gray(`[mock] captured ${hold.amountSui} SUI from ${hold.escrowId}`));
    return { txDigest: 'mock-capture' };
  }

  async release(hold: HoldId): Promise<TxResult> {
    console.log(chalk.gray(`[mock] released ${hold.amountSui} SUI from ${hold.escrowId}`));
    return { txDigest: 'mock-release' };
  }
}
