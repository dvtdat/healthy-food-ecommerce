import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { Product, Category, Review, Voucher, ChatMessage } from 'src/entities';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Product,
      Category,
      Review,
      Voucher,
      ChatMessage,
    ]),
    CartModule,
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService],
})
export class ChatbotModule {}
