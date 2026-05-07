import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class PauseVoucherDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  paused!: boolean;
}
