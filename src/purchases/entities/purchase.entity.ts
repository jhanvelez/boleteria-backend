import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Customer } from 'src/customers/entities/customer.entity';
import { Establishment } from 'src/establishments/entities/establishment.entity';
import { Raffle } from 'src/raffles/entities/raffle.entity';
import { Ticket } from 'src/tickets/entities/ticket.entity';

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @ManyToOne(() => Customer, { eager: true })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column()
  establishmentId: string;

  @ManyToOne(() => Establishment, { eager: true })
  @JoinColumn({ name: 'establishmentId' })
  establishment: Establishment;

  @Column()
  raffleId: string;

  @ManyToOne(() => Raffle, { eager: true })
  @JoinColumn({ name: 'raffleId' })
  raffle: Raffle;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('int')
  points: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ unique: true })
  invoiceNumber: string;

  @Column({ nullable: true })
  establishmentInvoiceNumber: string;

  @Column({ default: 'completed' })
  status: 'pending' | 'completed' | 'cancelled';

  @Column({ type: 'int', default: 0 })
  ticketsGenerated: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  previousBalance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  newBalance: number;

  @OneToMany(() => Ticket, (ticket) => ticket.purchase)
  tickets: Ticket[];

  @CreateDateColumn()
  purchaseDate: Date;

  @CreateDateColumn()
  createdAt: Date;
}
