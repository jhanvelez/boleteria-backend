import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreatePremiseDto {
  @IsNotEmpty()
  @IsString()
  numero_local: string;

  @IsOptional()
  @IsString()
  estado_local?: string;

  @IsOptional()
  @IsString()
  clase_local?: string;

  @IsOptional()
  @IsString()
  nivel?: string;

  @IsOptional()
  @IsString()
  tipoplaza?: string;

  @IsOptional()
  @IsNumber()
  area?: number;

  @IsOptional()
  @IsString()
  ficha_catastro?: string;

  @IsOptional()
  @IsString()
  destinacion?: string;
}
