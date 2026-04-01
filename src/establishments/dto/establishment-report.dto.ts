import { IsOptional, IsString, IsDateString } from 'class-validator';

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

  @IsString()
  @IsOptional()
  establishmentId?: string;
}
