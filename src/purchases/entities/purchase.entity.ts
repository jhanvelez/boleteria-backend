import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Customer } from 'src/customers/entities/customer.entity';
import { Establishment } from 'src/establishments/entities/establishment.entity';

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, { eager: true })
  customer: Customer;

  @ManyToOne(() => Establishment, { eager: true })
  establishment: Establishment;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('int')
  points: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  purchaseDate: Date;

  @CreateDateColumn()
  createdAt: Date;
}
