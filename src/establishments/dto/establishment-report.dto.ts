import { IsOptional, IsString, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class EstablishmentReportDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  raffleId?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  premiseId?: number;
}
