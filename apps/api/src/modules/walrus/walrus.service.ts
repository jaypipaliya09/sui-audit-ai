import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WalrusService {
  private readonly logger = new Logger(WalrusService.name);

  private readonly publisherUrl: string;
  private readonly aggregatorUrl: string;
  private readonly defaultEpochs: number;

  constructor() {
    this.publisherUrl =
      process.env.WALRUS_PUBLISHER_URL ||
      'https://publisher.walrus-testnet.walrus.space';
    this.aggregatorUrl =
      process.env.WALRUS_AGGREGATOR_URL ||
      'https://aggregator.walrus-testnet.walrus.space';
    this.defaultEpochs = parseInt(process.env.WALRUS_EPOCHS || '5', 10);
  }

  /**
   * Store an HTML report on Walrus Testnet as a permanent blob.
   *
   * @param htmlContent - The full HTML string to store
   * @param epochs      - Number of epochs the blob stays available (default from env)
   * @returns The blobId string
   */
  async storeReport(htmlContent: string, epochs?: number): Promise<string> {
    const numEpochs = epochs ?? this.defaultEpochs;
    const url = `${this.publisherUrl}/v1/blobs?epochs=${numEpochs}`;

    this.logger.log(
      `Uploading HTML report to Walrus (${htmlContent.length} bytes, ${numEpochs} epochs)...`,
    );

    try {
      const response = await axios.put(url, htmlContent, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
        timeout: 30_000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      const data = response.data;

      // Parse blobId — Walrus returns either newlyCreated or alreadyCertified
      const blobId =
        data?.newlyCreated?.blobObject?.blobId ||
        data?.alreadyCertified?.blobId;

      if (!blobId) {
        this.logger.error(
          `Walrus response did not contain a blobId. Response: ${JSON.stringify(data).substring(0, 500)}`,
        );
        throw new Error(
          'Walrus upload succeeded but no blobId was found in the response',
        );
      }

      const reportUrl = this.getReportUrl(blobId);
      this.logger.log(`✅ Report stored on Walrus — blobId: ${blobId}`);
      this.logger.log(`   View at: ${reportUrl}`);

      return blobId;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 'N/A';
        const body =
          typeof error.response?.data === 'string'
            ? error.response.data.substring(0, 300)
            : JSON.stringify(error.response?.data || {}).substring(0, 300);

        this.logger.error(
          `Walrus upload failed (HTTP ${status}): ${error.message}. Body: ${body}`,
        );
        throw new Error(
          `Walrus upload failed (HTTP ${status}): ${error.message}`,
        );
      }

      const errMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Walrus upload failed: ${errMsg}`);
      throw new Error(`Walrus upload failed: ${errMsg}`);
    }
  }

  /**
   * Store a PDF report on Walrus as a permanent blob. Browsers render the
   * aggregator URL as a PDF (content-sniffed), unlike raw HTML.
   *
   * @param pdf    - The PDF bytes
   * @param epochs - Number of epochs the blob stays available
   * @returns The blobId string
   */
  async storePdf(pdf: Buffer, epochs?: number): Promise<string> {
    const numEpochs = epochs ?? this.defaultEpochs;
    const url = `${this.publisherUrl}/v1/blobs?epochs=${numEpochs}`;

    this.logger.log(`Uploading PDF report to Walrus (${pdf.length} bytes, ${numEpochs} epochs)...`);

    try {
      const response = await axios.put(url, pdf, {
        headers: { 'Content-Type': 'application/pdf' },
        timeout: 30_000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      const data = response.data;
      const blobId = data?.newlyCreated?.blobObject?.blobId || data?.alreadyCertified?.blobId;
      if (!blobId) {
        throw new Error('Walrus PDF upload succeeded but no blobId was found in the response');
      }
      this.logger.log(`✅ PDF stored on Walrus — blobId: ${blobId}`);
      return blobId;
    } catch (error) {
      const errMsg = axios.isAxiosError(error)
        ? `HTTP ${error.response?.status || 'N/A'}: ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Unknown error';
      this.logger.error(`Walrus PDF upload failed: ${errMsg}`);
      throw new Error(`Walrus PDF upload failed: ${errMsg}`);
    }
  }

  /**
   * Fetch the raw bytes of a stored blob from the Walrus aggregator.
   * (The aggregator serves blobs as application/json regardless of the original
   * content-type, so we re-serve PDFs through our own API.)
   */
  async fetchBlob(blobId: string): Promise<Buffer> {
    const url = this.getReportUrl(blobId);
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30_000 });
    return Buffer.from(res.data);
  }

  /**
   * Get the public aggregator URL for a stored blob.
   *
   * @param blobId - The Walrus blob ID
   * @returns Full URL to view the blob content
   */
  getReportUrl(blobId: string): string {
    return `${this.aggregatorUrl}/v1/blobs/${blobId}`;
  }
}
