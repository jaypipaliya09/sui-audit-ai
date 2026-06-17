import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PdfService } from '../report/pdf.service.js';
import { ReportService } from '../report/report.service.js';
import { WalrusService } from '../walrus/walrus.service.js';
import { UsersService } from '../users/users.service.js';

export interface CreateAuditRunFile {
  file: string;
  overallRisk: string;
  findingsCount?: number;
  markdown: string;
  audit?: unknown;
}

export interface CreateAuditRunDto {
  walletAddress: string;
  totalCostUsdc?: number;
  escrowId?: string;
  txDigest?: string;
  files: CreateAuditRunFile[];
}

@Injectable()
export class AuditRunsService {
  private readonly logger = new Logger(AuditRunsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly reportService: ReportService,
    private readonly walrusService: WalrusService,
    private readonly usersService: UsersService,
  ) {}

  /** Store a completed CLI audit run + its per-file reports, each as a PDF on Walrus. */
  async create(dto: CreateAuditRunDto) {
    const walletAddress = dto.walletAddress.toLowerCase();

    // Register the Slush wallet as a user if we haven't seen it before, so CLI
    // users surface in the admin portal alongside web/Sui users.
    try {
      await this.usersService.upsertBySuiAddress(walletAddress);
    } catch (err) {
      this.logger.warn(
        `Could not register CLI wallet ${walletAddress}: ${(err as Error).message}`,
      );
    }

    // Generate a PDF per file and store it on Walrus (same as the web flow).
    const filesWithBlobs = await Promise.all(
      (dto.files ?? []).map(async (f) => {
        let blobId: string | undefined;
        let walrusUrl: string | undefined;
        try {
          const aj: any = f.audit ?? {};
          const contractName =
            aj.summary?.contractName || f.file.split('/').pop() || 'Contract';
          // Render the same styled HTML report → PDF as the web flow.
          const html = this.reportService.generateHtml(aj, contractName);
          const pdf = await this.pdfService.htmlToPdf(html);
          blobId = await this.walrusService.storePdf(pdf);
          walrusUrl = this.walrusService.getReportUrl(blobId);
        } catch (err) {
          this.logger.warn(`Walrus PDF store failed for ${f.file}: ${(err as Error).message}`);
        }
        return {
          file: f.file,
          overallRisk: f.overallRisk,
          findingsCount: f.findingsCount ?? 0,
          markdown: f.markdown,
          auditJson: (f.audit ?? null) as any,
          blobId,
          walrusUrl,
        };
      }),
    );

    return this.prisma.auditRun.create({
      data: {
        walletAddress,
        totalCostUsdc: dto.totalCostUsdc ?? 0,
        escrowId: dto.escrowId,
        txDigest: dto.txDigest,
        fileCount: filesWithBlobs.length,
        files: { create: filesWithBlobs },
      },
      include: { files: true },
    });
  }

  /** List runs for a wallet (newest first), without the heavy markdown bodies. */
  async listByWallet(walletAddress: string) {
    return this.prisma.auditRun.findMany({
      where: { walletAddress: walletAddress.toLowerCase() },
      orderBy: { createdAt: 'desc' },
      include: {
        files: {
          select: {
            id: true,
            file: true,
            overallRisk: true,
            findingsCount: true,
            blobId: true,
            walrusUrl: true,
          },
        },
      },
    });
  }

  /** Fetch one run with full per-file reports. */
  async findOne(id: string) {
    return this.prisma.auditRun.findUnique({
      where: { id },
      include: { files: true },
    });
  }
}
