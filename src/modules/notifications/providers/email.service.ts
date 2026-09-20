import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private from: string;

  constructor(private config: ConfigService) {
    this.from = config.get('MAIL_FROM', '"AIeCom" <noreply@aiecom.com>');
    this.transporter = nodemailer.createTransport({
      host: config.get('MAIL_HOST', 'smtp.gmail.com'),
      port: config.get<number>('MAIL_PORT', 587),
      secure: config.get('MAIL_SECURE', 'false') === 'true',
      auth: {
        user: config.get('MAIL_USER'),
        pass: config.get('MAIL_PASS'),
      },
    });
  }

  async send(to: string, subject: string, html: string, text?: string) {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html, text });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err.message);
    }
  }

  async sendWelcome(to: string, name: string) {
    return this.send(to, 'Welcome to AIeCom! 🎉', `
      <h1>Welcome, ${name}!</h1>
      <p>Thank you for joining AIeCom — your AI-powered beauty marketplace.</p>
      <p>Discover thousands of premium cosmetics from verified vendors, powered by AI recommendations tailored just for you.</p>
      <a href="${this.config.get('APP_URL')}" style="background:#e91e8c;color:white;padding:12px 24px;text-decoration:none;border-radius:6px">Start Shopping</a>
    `);
  }

  async sendOrderConfirmation(to: string, name: string, order: any) {
    return this.send(to, `Order Confirmed #${order.orderNumber}`, `
      <h1>Order Confirmed! ✅</h1>
      <p>Hi ${name}, your order <strong>#${order.orderNumber}</strong> has been confirmed.</p>
      <p><strong>Total:</strong> ${order.total} BDT</p>
      <p>We'll notify you when your order ships.</p>
    `);
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    return this.send(to, 'Reset Your Password', `
      <h1>Password Reset Request</h1>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="background:#e91e8c;color:white;padding:12px 24px;text-decoration:none;border-radius:6px">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
    `);
  }

  async sendVerificationEmail(to: string, verifyUrl: string) {
    return this.send(to, 'Verify Your Email Address', `
      <h1>Verify Your Email</h1>
      <p>Please verify your email address to activate your account.</p>
      <a href="${verifyUrl}" style="background:#e91e8c;color:white;padding:12px 24px;text-decoration:none;border-radius:6px">Verify Email</a>
    `);
  }

  async sendShippingUpdate(to: string, name: string, trackingNumber: string, courier: string) {
    return this.send(to, 'Your Order Has Shipped 📦', `
      <h1>Your Order is on the Way!</h1>
      <p>Hi ${name}, your order has been shipped via <strong>${courier}</strong>.</p>
      <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
    `);
  }
}
