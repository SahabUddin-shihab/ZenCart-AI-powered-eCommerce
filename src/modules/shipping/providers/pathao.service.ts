import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class PathaoService {
  private readonly logger = new Logger(PathaoService.name);
  private baseUrl: string;
  private token: string | null = null;

  constructor(private config: ConfigService) {
    this.baseUrl = config.get('PATHAO_BASE_URL', 'https://api-hermes.pathao.com');
  }

  private async getToken(): Promise<string> {
    if (this.token) return this.token;
    try {
      const resp = await axios.post(`${this.baseUrl}/aladdin/api/v1/issue-token`, {
        client_id: this.config.get('PATHAO_CLIENT_ID'),
        client_secret: this.config.get('PATHAO_CLIENT_SECRET'),
        username: this.config.get('PATHAO_USERNAME'),
        password: this.config.get('PATHAO_PASSWORD'),
        grant_type: 'password',
      });
      this.token = resp.data.access_token;
      setTimeout(() => { this.token = null; }, 3600 * 1000);
      return this.token!;
    } catch (e) {
      this.logger.error('Pathao auth failed', e.message);
      throw new Error('Pathao authentication failed');
    }
  }

  async getRates(fromCity: string, toCity: string, weight: number) {
    const token = await this.getToken();
    const resp = await axios.get(`${this.baseUrl}/aladdin/api/v1/price-plan`, {
      params: { city_id_from: fromCity, city_id_to: toCity, weight },
      headers: { Authorization: `Bearer ${token}` },
    });
    return resp.data;
  }

  async createOrder(data: {
    orderId: string;
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
    recipientCity: string;
    weight: number;
    amount: number;
    itemDescription: string;
  }) {
    const token = await this.getToken();
    const resp = await axios.post(
      `${this.baseUrl}/aladdin/api/v1/orders`,
      {
        store_id: this.config.get('PATHAO_STORE_ID'),
        merchant_order_id: data.orderId,
        recipient_name: data.recipientName,
        recipient_phone: data.recipientPhone,
        recipient_address: data.recipientAddress,
        recipient_city: data.recipientCity,
        delivery_type: 48,
        item_type: 2,
        item_quantity: 1,
        item_weight: data.weight,
        amount_to_collect: data.amount,
        item_description: data.itemDescription,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return resp.data;
  }

  async trackOrder(trackingCode: string) {
    const token = await this.getToken();
    const resp = await axios.get(`${this.baseUrl}/aladdin/api/v1/orders/${trackingCode}/info`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return resp.data;
  }
}
