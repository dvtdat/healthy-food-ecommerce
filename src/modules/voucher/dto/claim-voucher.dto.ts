import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ClaimVoucherDto {
  @ApiProperty({ example: 'SUMMER10' })
  @IsNotEmpty()
  @IsString()
  code!: string;
}
