import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Establishment } from './entities/establishment.entity';
import { EstablishmentsService } from './establishments.service';
import { EstablishmentsController } from './establishments.controller';
import { Premise } from 'src/premise/entities/premise.entity';
import { EstablishmentInvoiceCounter } from './entities/establishment-invoice-counter.entity';
import { Purchase } from 'src/purchases/entities/purchase.entity';
import { Ticket } from 'src/tickets/entities/ticket.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Establishment,
      Premise,
      EstablishmentInvoiceCounter,
      Purchase,
      Ticket,
    ]),
  ],
  controllers: [EstablishmentsController],
  providers: [EstablishmentsService],
  exports: [EstablishmentsService],
})
export class EstablishmentsModule {}
