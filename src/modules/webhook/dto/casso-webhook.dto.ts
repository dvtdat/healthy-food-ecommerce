import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CassoTransactionDto {
  @ApiProperty()
  @IsNumber()
  id!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  runningBalance?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transactionDateTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankAbbreviation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  virtualAccountNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  virtualAccountName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  counterAccountName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  counterAccountNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  counterAccountBankId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  counterAccountBankName?: string;
}

export class CassoWebhookDto {
  @ApiProperty()
  @IsNumber()
  error!: number;

  @ApiProperty({ type: [CassoTransactionDto] })
  @ValidateNested({ each: true })
  @Type(() => CassoTransactionDto)
  data!: CassoTransactionDto[];
}
