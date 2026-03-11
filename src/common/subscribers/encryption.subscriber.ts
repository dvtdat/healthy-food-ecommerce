import { EventSubscriber, EventArgs } from '@mikro-orm/core';
import { EncryptionService } from '../services/encryption.service';
import { Injectable } from '@nestjs/common';

type StringIndexEntity = Record<string, unknown>;

@Injectable()
export class EncryptionSubscriber implements EventSubscriber {
  private readonly fieldsToEncrypt = new Map<string, string[]>([
    ['User', ['firstName', 'lastName']],
  ]);

  private encryptedEntities = new WeakSet<object>();
  private readonly PREFIX = 'ENC:';

  constructor(private readonly encryptionService: EncryptionService) {}

  afterFlush() {
    this.encryptedEntities = new WeakSet();
  }

  beforeCreate(args: EventArgs<unknown>) {
    this.processEncryption(args.entity);
  }

  beforeUpdate(args: EventArgs<unknown>) {
    this.processEncryption(args.entity);
  }

  onLoad(args: EventArgs<unknown>) {
    this.processDecryption(args.entity);
  }

  private processEncryption(entity: unknown): void {
    if (!this.isIndexableObject(entity)) return;
    if (this.encryptedEntities.has(entity)) return;

    const fields = this.getFieldsToProcess(entity);
    if (!fields) return;

    for (const field of fields) {
      const value = entity[field];
      if (typeof value === 'string' && !this.looksEncrypted(value)) {
        entity[field] = this.PREFIX + this.encryptionService.encrypt(value);
      }
    }

    this.encryptedEntities.add(entity);
  }

  private processDecryption(entity: unknown): void {
    if (!this.isIndexableObject(entity)) return;

    const fields = this.getFieldsToProcess(entity);
    if (!fields) return;

    for (const field of fields) {
      const value = entity[field];
      if (typeof value === 'string' && this.looksEncrypted(value)) {
        const encryptedPayload = value.slice(this.PREFIX.length);
        entity[field] = this.encryptionService.decrypt(encryptedPayload);
      }
    }
  }

  private isIndexableObject(v: unknown): v is StringIndexEntity {
    return !!v && typeof v === 'object';
  }

  private getFieldsToProcess(entity: StringIndexEntity): string[] | undefined {
    const proto = Object.getPrototypeOf(entity);
    const name =
      typeof proto?.constructor?.name === 'string'
        ? proto.constructor.name
        : undefined;
    return name ? this.fieldsToEncrypt.get(name as string) : undefined;
  }

  private looksEncrypted(value: string): boolean {
    return value.startsWith(this.PREFIX);
  }
}
