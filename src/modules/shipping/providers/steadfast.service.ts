import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SteadFastService {
  private readonly logger = new Logger(SteadFastService.name);
  private baseUrl: string;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('STEADFAST_BASE_URL', 'https://portal.steadfast.com.bd/public/api/v1');
  }

  private get headers() {
    return {
      'Api-Key': this.config.get('STEADFAST_API_KEY'),
      'Secret-Key': this.config.get('STEADFAST_SECRET_KEY'),
      'Content-Type': 'application/json',
    };
  }

  async getRate(weight: number) {
    return {
      name: 'SteadFast Courier',
      cost: weight <= 0.5 ? 110 : weight <= 1 ? 120 : 120 + Math.ceil(weight - 1) * 40,
      estimatedDays: '2-3',
    };
  }

  async createOrder(data: {
    invoiceId: string;
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
    codAmount: number;
  }) {
    const resp = await axios.post(`${this.baseUrl}/create_order`, {
      invoice: data.invoiceId,
      recipient_name: data.recipientName,
      recipient_phone: data.recipientPhone,
      recipient_address: data.recipientAddress,
      cod_amount: data.codAmount,
    }, { headers: this.headers });
    return resp.data;
  }

  async trackOrder(trackingCode: string) {
    const resp = await axios.get(`${this.baseUrl}/status_by_trackingcode/${trackingCode}`, {
      headers: this.headers,
    });
    return resp.data;
  }

  async getBalance() {
    const resp = await axios.get(`${this.baseUrl}/get_balance`, { headers: this.headers });
    return resp.data;
  }
}
