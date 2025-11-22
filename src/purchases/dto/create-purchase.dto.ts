import { IsNotEmpty, IsUUID, IsNumber, Min } from 'class-validator';

export class CreatePurchaseDto {
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @IsNotEmpty()
  @IsUUID()
  establishmentId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;
}
