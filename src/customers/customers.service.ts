import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Customer } from './entities/customer.entity';
import { Cron } from '@nestjs/schedule';

import { PaginationQueryDto } from './dto/pagination-query.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
    private readonly httpService: HttpService,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<{
    data: Customer[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('cusmtomer');

    if (search) {
      qb.where(
        'cusmtomer.identification ILIKE :search OR cusmtomer.name ILIKE :search',
        {
          search: `%${search}%`,
        },
      );
    }

    const [data, total] = await qb
      .skip(skip)
      .take(limit)
      .orderBy('cusmtomer.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Customer> {
    return this.repo.findOneBy({ id });
  }

  async create(payload: Partial<Customer>): Promise<Customer> {
    const entity = this.repo.create(payload);
    return this.repo.save(entity);
  }

  async update(id: string, payload: Partial<Customer>): Promise<Customer> {
    await this.repo.update(id, payload);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  // Método que llama al endpoint externo y sincroniza (upsert) en DB
  async syncFromLeadConnector(
    limit = 50,
  ): Promise<{ imported: number; processed: number }> {
    const token = process.env.LEADCONNECTOR_TOKEN;
    const locationId = process.env.LEADCONNECTOR_LOCATION_ID;
    const url = process.env.LEADCONNECTOR_API_URL;

    if (!token || !locationId || !url) {
      this.logger.warn('Variables LEADCONNECTOR_* no configuradas');
      throw new Error('LeadConnector configuration missing');
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Version: '2021-07-28',
    };

    const params = {
      locationId,
      limit,
    };

    const resp$ = this.httpService.get(`${url}forms/submissions`, {
      headers,
      params,
    });
    const resp = await firstValueFrom(resp$);
    const data = resp.data;

    if (!data || !Array.isArray(data.submissions)) {
      this.logger.warn(
        'Respuesta inesperada de LeadConnector',
        JSON.stringify(data),
      );
      return { imported: 0, processed: 0 };
    }

    let processed = 0;
    let imported = 0;

    for (const item of data.submissions) {
      processed++;
      const mapped: Partial<Customer> = {
        id: item.id,
        contactId: item.contactId,
        formId: item.formId,
        name: item.others?.fullName || item.name || null,
        email: item.others?.email || item.email || null,
        phone: item.others?.phone || null,
        organization: item.others?.organization || null,
        postalCode: item.others?.postalCode || null,
        identification: item.Documento,
        city: item.others?.city || null,
        state: item.others?.state || null,
        country: item.others?.country || null,
        address: item.others?.address || null,
        external: item.external ?? false,
        createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
        raw: item,
      };

      try {
        if (mapped.identification) {
          const exists = await this.repo.findOne({
            where: { identification: mapped.identification },
          });

          if (exists) {
            this.logger.log(
              `Documento ${mapped.identification} ya existe, no se inserta.`,
            );
            continue;
          }
        }

        await this.repo.save(mapped as Customer);
        imported++;
      } catch (err) {
        this.logger.error(
          `Error saving customer ${item.id}: ${err.message}`,
          err.stack,
        );
      }
    }

    this.logger.log(
      `LeadConnector sync: processed=${processed} imported=${imported}`,
    );
    return { processed, imported };
  }

  // Cron: ejecuta si existe la variable LEADCONNECTOR_SYNC_CRON
  @Cron(process.env.LEADCONNECTOR_SYNC_CRON || '0 0 * * * *', {
    name: 'leadconnector-sync-cron',
    timeZone: 'America/Bogota',
  })
  async handleCron() {
    if (!process.env.LEADCONNECTOR_SYNC_CRON) {
      // Si variable no está definida, no ejecutamos automáticamente.
      return;
    }
    this.logger.log('Ejecutando cron de sincronización LeadConnector...');
    try {
      await this.syncFromLeadConnector(100);
    } catch (err) {
      this.logger.error(
        'Error en cron de sincronización',
        err.stack || err.message,
      );
    }
  }
}
