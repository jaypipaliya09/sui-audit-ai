/* eslint-disable */
// On-chain smoke test for the escrow flow (hold -> capture, hold -> release).
// Uses SUI as the coin type (the contract is generic over Coin<T>), so no USDC
// faucet is needed. Payer == authority == the active testnet address.
//
// Required env: ESCROW_PACKAGE_ID, TREASURY_ADDRESS, MOVE_AUDITOR_SECRET_KEY,
// TREASURY_SECRET_KEY (same key as payer for this test).
// Set before requiring config so constants pick them up.
process.env.USDC_COIN_TYPE = '0x2::sui::SUI';
process.env.USDC_DECIMALS = '9'; // SUI has 9 decimals
process.env.SUI_NETWORK = process.env.SUI_NETWORK || 'testnet';

const { EscrowPaymentService } = require('./dist/payment/escrow.service');
const { loadPayerKeypair } = require('./dist/sui/client');

async function main() {
  const payer = loadPayerKeypair();
  if (!payer) throw new Error('MOVE_AUDITOR_SECRET_KEY not set');
  console.log('Payer address:', payer.getPublicKey().toSuiAddress());

  const svc = new EscrowPaymentService(payer);
  const AMOUNT = 0.02; // 0.02 SUI

  console.log('\n=== Test 1: hold -> capture (deposit on success) ===');
  const hold1 = await svc.hold(AMOUNT);
  console.log('  locked:', hold1);
  const cap = await svc.capture(hold1);
  console.log('  captured tx:', cap.txDigest);

  console.log('\n=== Test 2: hold -> release (refund on failure/Ctrl+C) ===');
  const hold2 = await svc.hold(AMOUNT);
  console.log('  locked:', hold2);
  const rel = await svc.release(hold2);
  console.log('  released tx:', rel.txDigest);

  console.log('\n✓ Escrow smoke test passed: lock, capture, and refund all work.');
}

main().catch((e) => {
  console.error('\n✗ Smoke test failed:', e.message || e);
  process.exit(1);
});
