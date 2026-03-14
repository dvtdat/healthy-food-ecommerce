import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import config from '../mikro-orm.config';
import { RoleGuard } from './common/guards/role.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { CategoryModule } from './modules/category/category.module';
import { ProductModule } from './modules/product/product.module';
import { OrderModule } from './modules/order/order.module';
import { EncryptionService } from './common/services/encryption.service';
import { EncryptionSubscriber } from './common/subscribers/encryption.subscriber';
import { MikroORM } from '@mikro-orm/core';

@Module({
  imports: [
    UserModule,
    AuthModule,
    CategoryModule,
    ProductModule,
    OrderModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MikroOrmModule.forRoot(config),
  ],
  controllers: [],
  providers: [RoleGuard, EncryptionService, EncryptionSubscriber],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly orm: MikroORM,
    private readonly encryptionSubscriber: EncryptionSubscriber,
  ) {}

  onModuleInit() {
    this.orm.em.getEventManager().registerSubscriber(this.encryptionSubscriber);
  }
}
