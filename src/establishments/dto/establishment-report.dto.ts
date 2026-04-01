import { IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';

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

  @IsUUID()
  establishmentId?: string;
}
