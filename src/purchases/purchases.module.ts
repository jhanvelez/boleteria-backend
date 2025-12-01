import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { Purchase } from './entities/purchase.entity';
import { Point } from '../points/entities/point.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Establishment } from '../establishments/entities/establishment.entity';
import { Raffle } from '../raffles/entities/raffle.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Purchase,
      Point,
      Customer,
      Establishment,
      Raffle,
      Ticket,
    ]),
    TicketsModule,
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
