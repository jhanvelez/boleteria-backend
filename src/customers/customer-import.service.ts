import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { Customer } from 'src/customers/entities/customer.entity';

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

    // si viene con $ y espacios
    s = s.replace(/\$/g, '').trim();

    // si es algo como '100.000.000.000' (puntos como miles) -> quitarlos
    // si tiene coma decimal '1.234,56' -> convertir a 1234.56
    // heurística simple:
    if (s.includes(',') && s.includes('.')) {
      // formato europeo "1.234,56"
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes('.') && !s.includes(',')) {
      // "100.000.000" -> eliminar puntos
      s = s.replace(/\./g, '');
    } else if (s.includes(',') && !s.includes('.')) {
      // "1234,56" -> cambiar coma por punto
      s = s.replace(',', '.');
    }

    // eliminar otros caracteres no numéricos salvo el punto
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

  private transformRowToCustomer(row: any): Partial<Customer> {
    // Mapear nombres de columnas de tu Excel -> propiedades
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
      currentBalance: 0,
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
}
