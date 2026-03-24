import { Entity, OneToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../base/base.entity';
import { Order } from '../order/order.entity';

@Entity()
export class Payment extends BaseEntity {
  @OneToOne(() => Order, (order) => order.payment, { owner: true })
  order!: Order;

  @Property()
  cassoTransactionId!: number;

  @Property({ type: 'number' })
  amount!: number;

  @Property({ nullable: true })
  bankName?: string;

  @Property({ nullable: true })
  bankAbbreviation?: string;

  @Property({ nullable: true })
  accountNumber?: string;

  @Property()
  description!: string;

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
