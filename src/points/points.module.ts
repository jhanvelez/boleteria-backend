import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { Point } from './entities/point.entity';
import { Customer } from 'src/customers/entities/customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Point, Customer])],
  controllers: [PointsController],
  providers: [PointsService],
})
export class PointsModule {}
