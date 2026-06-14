import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

const FULLNODE_URLS: Record<string, string> = {
  mainnet: 'https://fullnode.mainnet.sui.io',
  testnet: 'https://fullnode.testnet.sui.io',
  devnet: 'https://fullnode.devnet.sui.io',
};

@Injectable()
export class OnChainRegistryService {
  private readonly client: SuiClient;
  private readonly keypair: Ed25519Keypair | null;
  private readonly logger = new Logger(OnChainRegistryService.name);
  private readonly registryPackageId: string;
  private readonly registryObjectId: string;

  constructor(private readonly configService: ConfigService) {
    const network = this.configService.get<string>('SUI_NETWORK') || 'testnet';
    const url = FULLNODE_URLS[network] || FULLNODE_URLS.testnet;
    this.client = new SuiClient({ url });

    const privateKey = this.configService.get<string>('SUI_BACKEND_PRIVATE_KEY');
    if (privateKey) {
      this.keypair = Ed25519Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
    } else {
      this.logger.warn('SUI_BACKEND_PRIVATE_KEY not set — on-chain anchoring will be skipped');
      this.keypair = null;
    }

    this.registryPackageId = this.configService.get<string>('REGISTRY_PACKAGE_ID') || '';
    this.registryObjectId = this.configService.get<string>('REGISTRY_OBJECT_ID') || '';
  }

  isConfigured(): boolean {
    return !!(this.keypair && this.registryPackageId && this.registryObjectId);
  }

  async anchorAudit(contractHash: string, blobId: string, riskLevel: number): Promise<string> {
    if (!this.isConfigured()) {
      this.logger.warn('On-chain anchoring skipped — missing configuration');
      return '';
    }

    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.registryPackageId}::registry::anchor_audit`,
      arguments: [
        tx.object(this.registryObjectId),
        tx.pure(Array.from(Buffer.from(contractHash, 'hex')), 'vector<u8>'),
        tx.pure(Array.from(Buffer.from(blobId)), 'vector<u8>'),
        tx.pure(riskLevel, 'u8'),
      ],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      signer: this.keypair!,
      transactionBlock: tx,
    });

    this.logger.log(`✅ Audit anchored on-chain — txDigest: ${result.digest}`);
    return result.digest;
  }

  getSuiscanUrl(txDigest: string): string {
    const network = this.configService.get<string>('SUI_NETWORK') || 'testnet';
    return `https://suiscan.xyz/${network}/tx/${txDigest}`;
  }

  riskLevelToNumber(risk: string): number {
    const mapping: Record<string, number> = {
      CLEAN: 0,
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
    };
    return mapping[risk] ?? 2;
  }
}
