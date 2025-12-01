import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { Purchase } from '../../purchases/entities/purchase.entity';

@Entity({ name: 'raffles' })
export class Raffle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', default: 'ticket' })
  ticketPrefix: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'start_date',
  })
  start_date: Date;

  @Column({
    type: 'timestamp',
    default: () => "CURRENT_TIMESTAMP + INTERVAL \'7 days\'",
    name: 'end_date',
  })
  end_date: Date;

  @Column({ type: 'varchar', default: 'active' })
  status: string;

  @Column({ type: 'int', nullable: true })
  totalTickets: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  ticketPrice: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.raffle)
  tickets: Ticket[];

  @OneToMany(() => Purchase, (purchase) => purchase.raffle)
  purchases: Purchase[];
}
