import { IsString, IsDateString, IsNotEmpty } from 'class-validator';

export class PurchaseReportDto {
  @IsString()
  @IsNotEmpty()
  identification: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
