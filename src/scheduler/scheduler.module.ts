import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { Customer } from 'src/customers/entities/customer.entity';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Customer])],
  providers: [SchedulerService],
})
export class SchedulerModule {}
