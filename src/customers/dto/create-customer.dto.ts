import { IsOptional, IsString, IsEmail, IsBoolean } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  raw?: any;

  @IsBoolean()
  vip: boolean;
}
