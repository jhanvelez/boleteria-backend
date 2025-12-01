import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Purchase } from '../../purchases/entities/purchase.entity';

@Entity({ name: 'points' })
export class Point {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  purchaseAmount: number;

  @Column({ type: 'int' })
  points: number;

  @ManyToOne(() => Customer, (customer) => customer.points)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column()
  customerId: string;

  @ManyToOne(() => Purchase, (purchase) => purchase.points)
  @JoinColumn({ name: 'purchaseId' })
  purchase: Purchase;

  @Column()
  purchaseId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
