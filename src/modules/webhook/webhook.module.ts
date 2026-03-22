import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { Order } from 'src/entities';

@Module({
  imports: [MikroOrmModule.forFeature([Order])],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
