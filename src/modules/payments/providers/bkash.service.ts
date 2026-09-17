import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class BkashService {
  private readonly logger = new Logger(BkashService.name);
  private baseUrl: string;
  private token: string | null = null;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('BKASH_BASE_URL', 'https://tokenized.sandbox.bka.sh/v1.2.0-beta');
  }

  private async getToken(): Promise<string> {
    if (this.token) return this.token;
    const resp = await axios.post(`${this.baseUrl}/tokenized/checkout/token/grant`, {
      app_key: this.config.get('BKASH_APP_KEY'),
      app_secret: this.config.get('BKASH_APP_SECRET'),
    }, {
      headers: {
        username: this.config.get('BKASH_USERNAME'),
        password: this.config.get('BKASH_PASSWORD'),
      },
    });
    this.token = resp.data.id_token;
    setTimeout(() => { this.token = null; }, 3500 * 1000);
    return this.token!;
  }

  async createPayment(orderId: string, amount: number, callbackUrl: string) {
    const token = await this.getToken();
    const resp = await axios.post(`${this.baseUrl}/tokenized/checkout/create`, {
      mode: '0011',
      payerReference: orderId,
      callbackURL: callbackUrl,
      amount: amount.toFixed(2),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: orderId,
    }, { headers: { Authorization: token, 'X-APP-Key': this.config.get('BKASH_APP_KEY') } });
    return { bkashURL: resp.data.bkashURL, paymentID: resp.data.paymentID };
  }

  async executePayment(paymentId: string) {
    const token = await this.getToken();
    const resp = await axios.post(`${this.baseUrl}/tokenized/checkout/execute`, { paymentID: paymentId }, {
      headers: { Authorization: token, 'X-APP-Key': this.config.get('BKASH_APP_KEY') },
    });
    return resp.data;
  }
}
