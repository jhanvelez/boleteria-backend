import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Establishment } from './entities/establishment.entity';
import { EstablishmentsService } from './establishments.service';
import { EstablishmentsController } from './establishments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Establishment])],
  controllers: [EstablishmentsController],
  providers: [EstablishmentsService],
  exports: [EstablishmentsService],
})
export class EstablishmentsModule {}
