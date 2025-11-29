import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Customer } from 'src/customers/entities/customer.entity';
import { Establishment } from 'src/establishments/entities/establishment.entity';
import { Raffle } from 'src/raffles/entities/raffle.entity';

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, { eager: true })
  @JoinColumn()
  customer: Customer;

  @ManyToOne(() => Establishment, { eager: true })
  @JoinColumn()
  establishment: Establishment;

  @ManyToOne(() => Raffle, { eager: true })
  @JoinColumn()
  raffle: Raffle;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('int')
  points: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ unique: true })
  invoiceNumber: string;

  @Column({ default: 'completed' })
  status: 'pending' | 'completed' | 'cancelled';

  @CreateDateColumn()
  purchaseDate: Date;

  @CreateDateColumn()
  createdAt: Date;
}
