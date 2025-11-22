import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { Purchase } from './entities/purchase.entity';
import { Customer } from 'src/customers/entities/customer.entity';
import { Establishment } from 'src/establishments/entities/establishment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Purchase, Customer, Establishment])],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
