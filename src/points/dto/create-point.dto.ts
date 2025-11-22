import { IsNumber, IsUUID } from 'class-validator';

export class CreatePointDto {
  @IsUUID()
  customerId: string;

  @IsNumber()
  purchaseAmount: number;
}
