import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { Loan } from '../user/entities/loan.entity';
import { LoanType } from '../user/entities/loan-type.entity';
import { LoanedItem } from '../user/entities/loaned-item.entity';
import { Warehouse } from '../user/entities/warehouse.entity';
import { Stock } from '../user/entities/stock.entity';
import { Notification } from '../notification/entities/notification.entity';
import { User } from '../user/entities/user.entity';
import { Department } from '../locations/entities/department.entity';
import { Municipality } from '../locations/entities/municipality.entity';

export const createDataSource = (configService: ConfigService) => {
  return new DataSource({
    type: 'postgres',
    host: configService.get<string>('DATABASE_HOST'),
    port: configService.get<number>('DATABASE_PORT'),
    username: configService.get<string>('DATABASE_USER'),
    password: configService.get<string>('DATABASE_PASSWORD'),
    database: configService.get<string>('DATABASE_NAME'),
    entities: [
      Loan,
      LoanType,
      LoanedItem,
      Warehouse,
      Stock,
      Notification,
      Permission,
      Role,
      User,
      Department,
      Municipality,
    ],
    synchronize: true,
  });
};
