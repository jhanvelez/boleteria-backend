import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';

export class CreateEstablishmentDto {
  @IsString()
  @IsNotEmpty()
  nombreComercial: string;

  @IsString()
  @IsOptional()
  categoria?: string;

  @IsBoolean()
  @IsOptional()
  activoInactivo?: boolean = true;

  @IsString()
  @IsOptional()
  telefono1?: string;

  @IsString()
  @IsOptional()
  telefono2?: string;

  @IsString()
  @IsOptional()
  telefono3?: string;

  @IsDateString()
  @IsOptional()
  fechaApertura?: string;

  @IsDateString()
  @IsOptional()
  fechaCierre?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsNumber()
  @IsOptional()
  area?: number;

  @IsString()
  @IsOptional()
  fichaCatastro?: string;

  @IsNumber()
  @IsNotEmpty()
  premiseId: number;
}
