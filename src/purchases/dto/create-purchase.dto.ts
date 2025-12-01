import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePurchaseDto {
  @IsString()
  customerId: string;

  @IsString()
  establishmentId: string;

  @IsString()
  raffleId: string;

  @IsNumber()
  @Min(1000)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : 0))
  calculatedTickets?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : 0))
  remainingBalance?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : 0))
  currentCustomerBalance?: number;
}
