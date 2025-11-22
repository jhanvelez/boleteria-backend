import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Raffle } from './entities/raffle.entity';
import { RafflesService } from './raffles.service';
import { RafflesController } from './raffles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Raffle])],
  controllers: [RafflesController],
  providers: [RafflesService],
  exports: [RafflesService],
})
export class RafflesModule {}
