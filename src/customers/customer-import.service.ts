import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { Customer } from 'src/customers/entities/customer.entity';

interface InvoiceRow {
  identificacion_c: string;
  'Valor de factura': any;
  [key: string]: any;
}

@Injectable()
export class CustomerImportService {
  private logger = new Logger('CustomerImportService');
  private BATCH_SIZE = 500;

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  private cleanNumber(val: any): number {
    if (val === null || val === undefined || val === '') return 0;
    let s = String(val).trim();

    s = s.replace(/\$/g, '').trim();

    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes('.') && !s.includes(',')) {
      // Verificar si es formato con puntos como miles (150.000.000.000)
      const parts = s.split('.');
      if (parts.length > 2) {
        s = s.replace(/\./g, '');
      }
    } else if (s.includes(',') && !s.includes('.')) {
      s = s.replace(',', '.');
    }

    s = s.replace(/[^\d.-]/g, '');
    const n = parseFloat(s);
    return Number.isNaN(n) ? 0 : n;
  }

  private normalizeId(uid: any, documento: any): string {
    if (uid && String(uid).trim()) return String(uid).trim();
    if (documento && String(documento).trim())
      return String(documento).replace(/\D/g, '').trim();
    return null;
  }

  private normalizeIdentification(ident: any): string {
    if (!ident) return null;
    return String(ident).replace(/\D/g, '').trim();
  }

  private transformRowToCustomer(row: any): Partial<Customer> {
    const uid = row['uid'] ?? row['id'] ?? null;
    const documento =
      row['Documento'] ?? row['Documento'] ?? row['documento'] ?? null;
    const first = row['first_name_c'] ?? row['first_name'] ?? '';
    const last = row['last_name_c'] ?? row['last_name'] ?? '';

    const acumuladas =
      row['acumuladas_real'] ??
      row['acumuladas_real'] ??
      row['acumulado_real'] ??
      row['acumuladas'] ??
      row['acumuladas_real'] ??
      row['acumuladas_real'];
    const acumuladoValue = this.cleanNumber(acumuladas);

    const email = row['eMail'] ?? row['email'] ?? null;
    const phone =
      row['Teléfono móvil'] ?? row['Tel√©fono m√≥vil'] ?? row['phone'] ?? null;

    const id =
      this.normalizeId(uid, documento) ??
      `legacy-${Math.random().toString(36).slice(2, 9)}`;

    const customer: Partial<Customer> = {
      id,
      name: `${first} ${last}`.trim() || null,
      email: email || null,
      phone: phone || null,
      address:
        row['Direcci√≥n de residencia'] ??
        row['Dirección de residencia'] ??
        row['address'] ??
        null,
      city: row['Municipio de residencia'] ?? row['city'] ?? null,
      state: row['departamento_c'] ?? row['state'] ?? null,
      country: row['pais_c'] ?? row['country'] ?? null,
      identification: documento ? String(documento).replace(/\D/g, '') : null,
      accumulatedValue: acumuladoValue,
      currentBalance: acumuladoValue, // Inicialmente el balance es igual al acumulado
      raw: row,
      external: true,
    };

    return customer;
  }

  async processLocalFile(filePath: string, options?: { dryRun?: boolean }) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const ext = filePath.split('.').pop().toLowerCase();

    let rows: any[] = [];
    if (ext === 'csv') {
      const workbook = XLSX.readFile(filePath, { raw: false, type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: null,
      });
    } else if (ext === 'xlsx' || ext === 'xls' || ext === 'txt') {
      const workbook = XLSX.readFile(filePath, { raw: false });
      const sheetName = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: null,
      });
    } else {
      throw new Error('Formato de archivo no soportado. Usa CSV o XLSX.');
    }

    this.logger.log(`Filas detectadas: ${rows.length}`);

    const batch: Partial<Customer>[] = [];
    let processed = 0;
    const toUpsertBatches: Partial<Customer>[][] = [];

    for (const row of rows) {
      const cust = this.transformRowToCustomer(row);

      if (!cust.id && !cust.identification) {
        this.logger.warn(
          'Fila sin id ni cedula, saltando',
          JSON.stringify(row).slice(0, 100),
        );
        continue;
      }

      batch.push(cust);

      if (batch.length >= this.BATCH_SIZE) {
        toUpsertBatches.push([...batch]);
        batch.length = 0;
      }
    }
    if (batch.length > 0) toUpsertBatches.push([...batch]);

    // Si dryRun: no escribimos, solo devolvemos resumen
    if (options?.dryRun) {
      return { rows: rows.length, batches: toUpsertBatches.length };
    }

    for (const b of toUpsertBatches) {
      await this.customerRepo.upsert(b as any[], ['id']);
      processed += b.length;
      this.logger.log(`Upserted batch: ${processed}/${rows.length}`);
    }

    return { totalRows: rows.length, processed };
  }

  /**
   * Procesa un archivo de facturas y actualiza el balance de los clientes
   * Por cada factura, resta del accumulatedValue y actualiza currentBalance
   */
  async processInvoicesFile(
    filePath: string,
    dryRun: boolean = false,
  ): Promise<any> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Archivo no encontrado: ${filePath}`);
    }

    this.logger.log(`Procesando archivo de facturas: ${filePath}`);

    // Leer el archivo Excel
    const workbook = XLSX.readFile(filePath, { raw: false });
    const sheetName = workbook.SheetNames[0];
    const rows: InvoiceRow[] = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName],
      {
        defval: null,
      },
    );

    this.logger.log(`Facturas detectadas: ${rows.length}`);

    const processedInvoices = [];
    const customersUpdated = new Set<string>();
    let invoicesProcessed = 0;
    let invoicesSkipped = 0;

    for (const row of rows) {
      const identification = this.normalizeIdentification(row.identificacion_c);

      if (!identification) {
        this.logger.warn(`Factura sin identificación: ${JSON.stringify(row)}`);
        invoicesSkipped++;
        continue;
      }

      const invoiceValue = this.cleanNumber(row['Valor de factura']);

      if (invoiceValue <= 0) {
        this.logger.warn(
          `Factura con valor cero o negativo: ${JSON.stringify(row)}`,
        );
        invoicesSkipped++;
        continue;
      }

      // Buscar el cliente por identificación
      const customer = await this.customerRepo.findOne({
        where: { identification },
      });

      if (!customer) {
        this.logger.warn(
          `Cliente no encontrado con identificación: ${identification}`,
        );
        processedInvoices.push({
          identification,
          invoiceValue,
          status: 'CLIENT_NOT_FOUND',
          oldBalance: null,
          newBalance: null,
        });
        invoicesSkipped++;
        continue;
      }

      // Calcular nuevo balance
      const oldBalance = customer.currentBalance;
      const newBalance = Math.max(0, oldBalance - invoiceValue);

      if (!dryRun) {
        // Actualizar el cliente
        customer.currentBalance = newBalance;
        await this.customerRepo.save(customer);
      }

      customersUpdated.add(customer.id);
      invoicesProcessed++;

      processedInvoices.push({
        identification,
        customerId: customer.id,
        customerName: customer.name,
        invoiceValue,
        oldBalance,
        newBalance,
        status: 'PROCESSED',
      });

      this.logger.log(
        `Factura procesada: ${identification} - Valor: ${invoiceValue} - ` +
          `Balance anterior: ${oldBalance} - Balance nuevo: ${newBalance}`,
      );

      // Log cada 100 facturas
      if (invoicesProcessed % 100 === 0) {
        this.logger.log(
          `Facturas procesadas: ${invoicesProcessed}/${rows.length}`,
        );
      }
    }

    // Resumen final
    const summary = {
      totalInvoices: rows.length,
      invoicesProcessed,
      invoicesSkipped,
      customersUpdated: customersUpdated.size,
      processedInvoices: dryRun ? processedInvoices : undefined, // Solo devolver detalles en dryRun
    };

    this.logger.log(`Procesamiento completado: ${JSON.stringify(summary)}`);

    return summary;
  }
}
