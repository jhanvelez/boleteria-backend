import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateRaffleDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(['pending', 'active', 'finished'])
  status?: 'pending' | 'active' | 'finished';
}
