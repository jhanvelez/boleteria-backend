import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PremiseService } from './premise.service';
import { PremiseController } from './premise.controller';
import { Premise } from './entities/premise.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Premise])],
  controllers: [PremiseController],
  providers: [PremiseService],
  exports: [PremiseService],
})
export class PremiseModule {}
