import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { Customer } from 'src/customers/entities/customer.entity';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  private readonly BEARER_TOKEN = process.env.LEADCONNECTOR_TOKEN;

  private readonly BASE_URL =
    'https://services.leadconnectorhq.com/forms/submissions/?locationId=AwteSl6b12ZdYDMO2W73&limit=50';

  @Cron(CronExpression.EVERY_5_MINUTES)
  async fetchCustomers() {
    try {
      this.logger.log('⏳ Iniciando captura de clientes...');

      const response = await firstValueFrom(
        this.httpService.get(this.BASE_URL, {
          headers: {
            Authorization: `Bearer ${this.BEARER_TOKEN}`,
          },
        }),
      );

      const submissions = response.data?.submissions ?? [];
      this.logger.log(`📥 ${submissions.length} clientes obtenidos`);

      for (const item of submissions) {
        const data = item.others;

        const existing = await this.customerRepo.findOne({
          where: { email: data.email },
        });

        if (!existing) {
          const customer = this.customerRepo.create({
            name: data.fullName || item.name,
            email: data.email,
            phone: data.phone,
            city: data.city,
            state: data.state,
            country: data.country,
            address: data.address,
            external: item.id,
          });

          await this.customerRepo.save(customer);
          this.logger.log(`✅ Cliente registrado: ${customer.name}`);
        } else {
          this.logger.log(`⚠️ Cliente ya existe: ${data.email}`);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error capturando clientes: ${error.message}`);
    }
  }
}
