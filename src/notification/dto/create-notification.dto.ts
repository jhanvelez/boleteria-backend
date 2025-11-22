import { IsString, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class CreateNotificationDto {
  @IsNumber()
  userId: number;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @IsString()
  type: string;
}
