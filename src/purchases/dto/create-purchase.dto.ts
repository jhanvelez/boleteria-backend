import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreatePurchaseDto {
  @IsString()
  customerId: string;

  @IsUUID()
  @IsString()
  establishmentId: string;

  @IsUUID()
  @IsString()
  raffleId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
