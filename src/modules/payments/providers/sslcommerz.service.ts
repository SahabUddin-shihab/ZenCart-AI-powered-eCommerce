import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class SslCommerzService {
  private readonly logger = new Logger(SslCommerzService.name);
  private isLive: boolean;

  constructor(private config: ConfigService) {
    this.isLive = config.get('SSLCOMMERZ_IS_LIVE', 'false') === 'true';
  }

  async initiateSession(orderId: string, amount: number, user: any, successUrl: string) {
    const baseUrl = this.isLive
      ? 'https://securepay.sslcommerz.com'
      : 'https://sandbox.sslcommerz.com';

    const data = {
      store_id: this.config.get('SSLCOMMERZ_STORE_ID'),
      store_passwd: this.config.get('SSLCOMMERZ_STORE_PASS'),
      total_amount: amount.toFixed(2),
      currency: 'BDT',
      tran_id: orderId,
      success_url: successUrl,
      fail_url: `${successUrl}?status=failed`,
      cancel_url: `${successUrl}?status=cancelled`,
      ipn_url: `${this.config.get('APP_URL')}/api/v1/payments/sslcommerz/ipn`,
      cus_name: `${user.firstName} ${user.lastName}`,
      cus_email: user.email,
      cus_phone: user.phone || '01700000000',
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: 'AIeCom Order',
      product_category: 'Cosmetics',
      product_profile: 'general',
      value_a: orderId,
    };

    const resp = await axios.post(`${baseUrl}/gwprocess/v4/api.php`, data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return { gatewayUrl: resp.data.GatewayPageURL, sessionKey: resp.data.sessionkey };
  }

  async validateIpn(data: any): Promise<boolean> {
    const storePassMd5 = crypto.createHash('md5').update(this.config.get('SSLCOMMERZ_STORE_PASS', '')).digest('hex');
    const modifiedAmount = parseFloat(data.amount).toFixed(2);
    const hashStr = `${data.val_id}${this.config.get('SSLCOMMERZ_STORE_ID')}${modifiedAmount}${storePassMd5}`;
    const hashKey = crypto.createHash('md5').update(hashStr).digest('hex');
    return hashKey === data.verify_sign;
  }
}
