import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { render } from '@react-email/render';

import { AuditCompleteEmail } from './templates/audit-complete.js';
import { WelcomeEmail } from './templates/welcome.js';
import { EmailVerifyEmail } from './templates/email-verify.js';
import { QuotaWarningEmail } from './templates/quota-warning.js';
import { PaymentFailedEmail } from './templates/payment-failed.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly defaultFrom = 'MoveAuditor <audits@moveauditor.xyz>';
  private readonly receiverEmail: string;

  constructor(private readonly configService: ConfigService) {
    this.receiverEmail = this.configService.get<string>('NOTIFY_EMAIL') || 'suiauditer@gmail.com';
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
      this.logger.log('Nodemailer SMTP transporter initialized');
    } else {
      this.logger.warn('SMTP credentials not configured. Emails will be logged but not sent.');
    }
  }

  private async sendEmail(options: { to: string; subject: string; html: string; from?: string }) {
    if (!this.transporter) {
      this.logger.debug(`[MOCK EMAIL to ${this.receiverEmail}] (intended ${options.to}) Subject: ${options.subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: options.from || this.defaultFrom,
        to: this.receiverEmail,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email sent to ${this.receiverEmail} (intended ${options.to}): ${options.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${error}`);
    }
  }

  async sendWelcome(email: string, name: string) {
    const html = await render(WelcomeEmail({ name }));
    await this.sendEmail({
      to: email,
      subject: 'Welcome to MoveAuditor!',
      html,
      from: 'hello@moveauditor.xyz',
    });
  }

  async sendEmailVerification(email: string, verifyUrl: string) {
    const html = await render(EmailVerifyEmail({ verifyUrl }));
    await this.sendEmail({
      to: email,
      subject: 'Verify your MoveAuditor account',
      html,
      from: 'hello@moveauditor.xyz',
    });
  }

  async sendPasswordReset(email: string, resetUrl: string) {
    // Reusing verify template visually, just different wording
    const html = await render(EmailVerifyEmail({ verifyUrl: resetUrl, title: 'Reset your password' }));
    await this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html,
      from: 'hello@moveauditor.xyz',
    });
  }

  async sendAuditComplete(
    email: string,
    data: {
      contractName: string;
      riskLevel: string;
      criticalCount: number;
      highCount: number;
      mediumCount: number;
      reportUrl: string;
      walrusUrl?: string;
      onChainUrl?: string;
    },
  ) {
    const html = await render(AuditCompleteEmail(data));
    await this.sendEmail({
      to: email,
      subject: `Audit Complete: ${data.contractName}`,
      html,
    });
  }

  async sendRepoAuditComplete(
    email: string,
    data: {
      repoName: string;
      riskLevel: string;
      contractsAudited: number;
      totalFindings: number;
      reportUrl: string;
      walrusUrl?: string;
    },
  ) {
    const html = await render(AuditCompleteEmail({
      contractName: data.repoName,
      riskLevel: data.riskLevel,
      criticalCount: 0, // Using the same template loosely
      highCount: 0,
      mediumCount: 0,
      reportUrl: data.reportUrl,
      walrusUrl: data.walrusUrl,
      isRepo: true,
      totalFindings: data.totalFindings,
      contractsAudited: data.contractsAudited,
    }));
    await this.sendEmail({
      to: email,
      subject: `Repository Audit Complete: ${data.repoName}`,
      html,
    });
  }

  async sendAuditFailed(email: string, data: { contractName: string; errorMessage: string }) {
    const html = await render(AuditCompleteEmail({
      contractName: data.contractName,
      riskLevel: 'UNKNOWN',
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      reportUrl: '',
      isError: true,
      errorMessage: data.errorMessage,
    }));
    await this.sendEmail({
      to: email,
      subject: `Audit Failed: ${data.contractName}`,
      html,
    });
  }

  async sendQuotaWarning(email: string, data: { used: number; limit: number; resetDate: string; upgradeUrl: string }) {
    const html = await render(QuotaWarningEmail(data));
    await this.sendEmail({
      to: email,
      subject: 'Action Required: Approaching Audit Quota Limit',
      html,
    });
  }

  async sendQuotaExceeded(email: string, data: { limit: number; resetDate: string; upgradeUrl: string }) {
    const html = await render(QuotaWarningEmail({ ...data, used: data.limit, exceeded: true }));
    await this.sendEmail({
      to: email,
      subject: 'Quota Exceeded: Audit paused',
      html,
    });
  }

  async sendInvoiceConfirmation(email: string, data: { amount: string; plan: string; invoiceUrl: string }) {
    // simple HTML for now
    const html = `<p>Your payment of ${data.amount} for the ${data.plan} plan was successful.</p><p><a href="${data.invoiceUrl}">View Invoice</a></p>`;
    await this.sendEmail({
      to: email,
      subject: 'Payment Successful',
      html,
    });
  }

  async sendPaymentFailed(email: string, data: { amount: string; updatePaymentUrl: string }) {
    const html = await render(PaymentFailedEmail(data));
    await this.sendEmail({
      to: email,
      subject: 'Action Required: Payment Failed',
      html,
    });
  }
}
