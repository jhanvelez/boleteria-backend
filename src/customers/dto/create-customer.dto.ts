import { IsOptional, IsString, IsEmail } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  // agrega otros campos según necesites
  @IsOptional()
  raw?: any;
}
