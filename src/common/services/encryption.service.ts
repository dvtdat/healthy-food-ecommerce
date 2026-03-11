import { Injectable } from '@nestjs/common';
import * as CryptoJS from 'crypto-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EncryptionService {
  private readonly encryptionKey: string;

  constructor(private configService: ConfigService) {
    this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') ?? '';

    if (!this.encryptionKey) {
      throw new Error('ENCRYPTION_KEY must be set in environment variables');
    }
  }

  encrypt(text: string): string {
    if (!text) return text;
    return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText) return encryptedText;
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      return encryptedText;
    }
  }
}
