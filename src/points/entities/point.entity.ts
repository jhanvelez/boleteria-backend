import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from 'src/customers/entities/customer.entity';

@Entity()
export class Point {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 12, scale: 2 })
  purchaseAmount: number;

  @Column('int')
  points: number;

  @ManyToOne(() => Customer, (customer) => customer.points, {
    onDelete: 'CASCADE',
  })
  customer: Customer;

  @CreateDateColumn()
  createdAt: Date;
}
