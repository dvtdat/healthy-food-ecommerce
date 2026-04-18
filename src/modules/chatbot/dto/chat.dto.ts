import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ example: 'Cho tôi xem các sản phẩm đang còn hàng' })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
