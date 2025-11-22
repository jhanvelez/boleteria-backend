import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { Municipality } from './entities/municipality.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Department, Municipality])],
  providers: [LocationsService],
  controllers: [LocationsController],
  exports: [LocationsService],
})
export class LocationsModule {}
