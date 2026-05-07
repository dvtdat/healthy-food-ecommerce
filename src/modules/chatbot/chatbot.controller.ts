import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ChatbotService } from './chatbot.service';
import { ChatMessageDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from 'src/common/decorators/current-user.decorator';

@ApiTags('chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Chat with AI assistant about the shop',
    description:
      'Send a message and get AI-powered responses about products, prices, vouchers, delivery, etc. History is stored per user (last 10 messages).',
  })
  @ApiOkResponse({
    schema: {
      properties: {
        reply: { type: 'string', example: 'Hiện shop có 12 sản phẩm...' },
        cartChanged: { type: 'boolean', example: false },
        action: {
          type: 'string',
          example: 'add_to_cart',
          nullable: true,
        },
      },
    },
  })
  chat(
    @Body() dto: ChatMessageDto,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    return this.chatbotService.chat(dto, currentUser);
  }

  @UseGuards(JwtAuthGuard)
  @Get('messages')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user chat history',
    description:
      'Returns the last 10 messages (oldest first) for the authenticated user.',
  })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['user', 'model'] },
          text: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  getHistory(@CurrentUser() currentUser: CurrentUserData) {
    return this.chatbotService.getHistory(currentUser);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('messages')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear current user chat history' })
  clearHistory(@CurrentUser() currentUser: CurrentUserData) {
    return this.chatbotService.clearHistory(currentUser);
  }
}
