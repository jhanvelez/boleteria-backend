import { IsOptional, IsString, IsDateString } from 'class-validator';

export class InvoiceReportDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  establishmentId?: string;

  @IsString()
  @IsOptional()
  raffleId?: string;
}
