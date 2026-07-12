import nodemailer from 'nodemailer';
import config from '../../config';
import logger from '../../config/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // If SMTP host is not provided, fall back to a mock local transporter
    if (!config.SMTP_HOST) {
      logger.warn('[EmailService] SMTP configurations are missing. Using mock console transporter.');
      this.transporter = nodemailer.createTransport({
        streamConfig: true
      } as any);
    } else {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465, // True for port 465, false for 587
        auth: config.SMTP_USER && config.SMTP_PASS ? {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS
        } : undefined,
        tls: {
          rejectUnauthorized: config.NODE_ENV === 'production'
        }
      });
    }
  }

  /**
   * Dispatches an email using SMTP transport.
   */
  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: config.SMTP_FROM,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // Strips HTML tags for text fallback
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`[EmailService] Email sent successfully to ${to} (MessageID: ${info.messageId})`);
      return true;
    } catch (error) {
      logger.error(`[EmailService Error] Failed to send email to ${to}:`, error);
      return false;
    }
  }
}

export const emailService = new EmailService();
export default emailService;
