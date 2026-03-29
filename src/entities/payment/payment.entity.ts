import { Entity, OneToOne, Property } from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../base/base.entity';
import { Order } from '../order/order.entity';

@Entity()
export class Payment extends BaseEntity {
  @OneToOne(() => Order, (order) => order.payment, { owner: true })
  order!: Order;

  @ApiProperty({ example: 12345 })
  @Property()
  cassoTransactionId!: number;

  @ApiProperty({ example: 150000 })
  @Property({ type: 'number' })
  amount!: number;

  @ApiPropertyOptional({ example: 'Vietcombank' })
  @Property({ nullable: true })
  bankName?: string;

  @ApiPropertyOptional({ example: 'VCB' })
  @Property({ nullable: true })
  bankAbbreviation?: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @Property({ nullable: true })
  accountNumber?: string;

  @ApiProperty({ example: 'THANHTOAN 507f1f77bcf86cd799439011' })
  @Property()
  description!: string;

  @ApiProperty()
  @Property()
  confirmedAt!: Date;

  constructor(
    order: Order,
    cassoTransactionId: number,
    amount: number,
    description: string,
    confirmedAt: Date,
    bankName?: string,
    bankAbbreviation?: string,
    accountNumber?: string,
  ) {
    super();
    this.order = order;
    this.cassoTransactionId = cassoTransactionId;
    this.amount = amount;
    this.description = description;
    this.confirmedAt = confirmedAt;
    this.bankName = bankName;
    this.bankAbbreviation = bankAbbreviation;
    this.accountNumber = accountNumber;
  }
}
