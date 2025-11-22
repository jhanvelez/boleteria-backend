import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './user/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RolesModule } from './roles/roles.module';
import { CaslModule } from './auth/casl/casl.module';
import { LocationsModule } from './locations/locations.module';
import { NotificationModule } from './notification/notification.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { CustomersModule } from './customers/customers.module';
import { EstablishmentsModule } from './establishments/establishments.module';
import { RafflesModule } from './raffles/raffles.module';
import { PurchasesModule } from './purchases/purchases.module';
import { PointsModule } from './points/points.module';

import { ScheduleModule } from '@nestjs/schedule';

import * as crypto from 'crypto';
(global as any).crypto = crypto;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        autoLoadEntities: true,
        synchronize: true,
        charset: 'utf8mb4',
      }),
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    CaslModule,
    LocationsModule,
    NotificationModule,
    SchedulerModule,
    CustomersModule,
    EstablishmentsModule,
    RafflesModule,
    PurchasesModule,
    PointsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
