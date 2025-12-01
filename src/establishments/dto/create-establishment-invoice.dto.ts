import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateEstablishmentInvoiceDto {
  @IsString()
  @IsNotEmpty()
  establishmentId: string;

  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @IsOptional()
  @IsString()
  description?: string;
}
