import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateRaffleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value)
  start_date?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value)
  end_date?: string;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'active', 'finished'])
  status?: string;

  @IsOptional()
  @IsString()
  ticketPrefix?: string;

  @IsOptional()
  totalTickets?: number;

  @IsOptional()
  ticketPrice?: number;
}
