import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VietQRService {
  private readonly bankId: string;
  private readonly accountNumber: string;
  private readonly accountName: string;

  constructor(private readonly configService: ConfigService) {
    this.bankId = this.configService.getOrThrow<string>('VIETQR_BANK_ID');
    this.accountNumber = this.configService.getOrThrow<string>(
      'VIETQR_ACCOUNT_NUMBER',
    );
    this.accountName = this.configService.getOrThrow<string>(
      'VIETQR_ACCOUNT_NAME',
    );
  }

  generateQrUrl(orderId: string, amount: number): string {
    const memo = `THANHTOAN ${orderId}`;
    const params = new URLSearchParams({
      amount: String(amount),
      addInfo: memo,
      accountName: this.accountName,
    });
    return `https://img.vietqr.io/image/${this.bankId}-${this.accountNumber}-compact2.png?${params.toString()}`;
  }

  getPaymentInfo(orderId: string, amount: number) {
    return {
      bankId: this.bankId,
      accountNumber: this.accountNumber,
      accountName: this.accountName,
      amount,
      memo: `THANHTOAN ${orderId}`,
      qrUrl: this.generateQrUrl(orderId, amount),
    };
  }
}
