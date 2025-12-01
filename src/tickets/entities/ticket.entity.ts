import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from 'src/customers/entities/customer.entity';
import { Raffle } from 'src/raffles/entities/raffle.entity';
import { Purchase } from 'src/purchases/entities/purchase.entity';

@Entity({ name: 'tickets' })
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  ticketNumber: string;

  @ManyToOne(() => Customer, (customer) => customer.tickets)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column()
  customerId: string;

  @ManyToOne(() => Raffle, (raffle) => raffle.tickets)
  @JoinColumn({ name: 'raffleId' })
  raffle: Raffle;

  @Column()
  raffleId: string;

  @ManyToOne(() => Purchase, (purchase) => purchase.tickets)
  @JoinColumn({ name: 'purchaseId' })
  purchase: Purchase;

  @Column()
  purchaseId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amountUsed: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'varchar', default: 'active' })
  status: string;
}
