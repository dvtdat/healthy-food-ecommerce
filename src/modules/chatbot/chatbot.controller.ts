import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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

  @UseGuards(JwtAuthGuard)
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
      },
    },
  })
  chat(
    @Body() dto: ChatMessageDto,
    @CurrentUser() currentUser: CurrentUserData,
  ) {
    return this.chatbotService.chat(dto, currentUser);
  }
}
