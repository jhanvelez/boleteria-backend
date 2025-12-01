import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { CustomerImportService } from './customer-import.service';
import { CustomersController } from './customers.controller';
import { CustomerImportController } from './customer-import.controller';
import { Customer } from './entities/customer.entity';
import { HttpModule as NestHttpModule } from '@nestjs/axios';

@Module({
  imports: [TypeOrmModule.forFeature([Customer]), NestHttpModule],
  controllers: [CustomersController, CustomerImportController],
  providers: [CustomersService, CustomerImportService],
  exports: [CustomersService, CustomerImportService],
})
export class CustomersModule {}
