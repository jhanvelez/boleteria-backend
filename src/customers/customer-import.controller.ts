import { Controller, Post, Body } from '@nestjs/common';
import { CustomerImportService } from './customer-import.service';

@Controller('customers/import')
export class CustomerImportController {
  constructor(private readonly importService: CustomerImportService) {}

  @Post()
  async importFromLocal(@Body('path') path: string) {
    if (!path) {
      return { error: 'Debe enviar { "path": "<ruta del archivo>" }' };
    }

    const result = await this.importService.processLocalFile(path);

    return {
      message: 'Importación completada correctamente',
      ...result,
    };
  }

  @Post('dry-run')
  async dryRun(@Body('path') path: string) {
    const result = await this.importService.processLocalFile(path, {
      dryRun: true,
    });

    return {
      message: 'Dry run ejecutado correctamente',
      ...result,
    };
  }

  @Post('invoices')
  async processInvoices(@Body('path') path: string) {
    if (!path) {
      return { error: 'Debe enviar { "path": "<ruta del archivo>" }' };
    }

    const result = await this.importService.processInvoicesFile(path);

    return {
      message: 'Procesamiento de facturas completado',
      ...result,
    };
  }

  @Post('invoices/dry-run')
  async invoicesDryRun(@Body('path') path: string) {
    const result = await this.importService.processInvoicesFile(path, true);

    return {
      message: 'Dry run de facturas ejecutado correctamente',
      ...result,
    };
  }
}
