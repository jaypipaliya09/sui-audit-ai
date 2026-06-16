import { Transaction, coinWithBalance } from '@mysten/sui/transactions';

export const TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_TREASURY_ADDRESS ||
  '0x7c23479f9746a400ae9fddd93158f97e864dde6837942d863d52c9893e7765a8';

export const USDC_COIN_TYPE =
  process.env.NEXT_PUBLIC_USDC_COIN_TYPE ||
  '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC';

const USDC_DECIMALS = Number(process.env.NEXT_PUBLIC_USDC_DECIMALS || 6);

/**
 * Transfer `amountUsdc` USDC from the connected Slush wallet to the treasury.
 * Mirrors the injected wallet-standard signing flow used elsewhere in the app.
 * Returns the transaction digest, which the backend verifies on-chain.
 */
export async function payUsdcToTreasury(
  provider: any,
  address: string,
  amountUsdc: number,
): Promise<string> {
  if (!provider) throw new Error('Wallet not connected');

  const tx = new Transaction();
  tx.setSender(address);
  const base = BigInt(Math.round(amountUsdc * 10 ** USDC_DECIMALS));
  const coin = coinWithBalance({ type: USDC_COIN_TYPE, balance: base });
  tx.transferObjects([coin], tx.pure.address(TREASURY_ADDRESS));

  const account = await resolveAccount(provider, address);

  let txResult: any;
  if (provider.features?.['sui:signAndExecuteTransaction'] && account) {
    txResult = await provider.features['sui:signAndExecuteTransaction'].signAndExecuteTransaction({
      account,
      chain: 'sui:testnet',
      transaction: tx,
      options: { showEffects: true },
    });
  } else if (provider.features?.['sui:signAndExecuteTransactionBlock'] && account) {
    txResult = await provider.features['sui:signAndExecuteTransactionBlock'].signAndExecuteTransactionBlock({
      account,
      chain: 'sui:testnet',
      transactionBlock: tx,
      options: { showEffects: true },
    });
  } else if (typeof provider.signAndExecuteTransactionBlock === 'function') {
    txResult = await provider.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      options: { showEffects: true },
    });
  } else {
    throw new Error('Wallet connected but no active account found. Please reconnect.');
  }

  if (txResult.effects && txResult.effects.status?.status === 'failure') {
    throw new Error('Payment transaction failed on the Sui network.');
  }
  const digest = txResult.digest || txResult.transactionEffects?.transactionDigest;
  if (!digest) throw new Error('Wallet returned no transaction digest.');
  return digest;
}

async function resolveAccount(provider: any, address: string): Promise<any> {
  const matches = (a: any) => {
    const addr = typeof a === 'string' ? a : a?.address;
    return addr?.toLowerCase() === address.toLowerCase();
  };

  if (provider.accounts?.length) {
    return provider.accounts.find(matches) || provider.accounts[0];
  }
  if (typeof provider.getAccounts === 'function') {
    try {
      const accounts = await provider.getAccounts();
      const found = accounts?.find(matches) || accounts?.[0];
      if (found) return typeof found === 'string' ? { address: found } : found;
    } catch {
      /* fall through */
    }
  }
  if (provider.features?.['standard:connect']?.connect) {
    try {
      const res = await provider.features['standard:connect'].connect();
      const accounts = res.accounts || provider.accounts || [];
      return accounts.find(matches) || accounts[0];
    } catch {
      /* fall through */
    }
  }
  return null;
}
