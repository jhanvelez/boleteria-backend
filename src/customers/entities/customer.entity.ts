import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Point } from 'src/points/entities/point.entity';
import { Ticket } from 'src/tickets/entities/ticket.entity';

@Entity({ name: 'customers' })
export class Customer {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar', nullable: true })
  contactId: string;

  @Column({ type: 'varchar', nullable: true })
  formId: string;

  @Column({ type: 'varchar', nullable: true })
  identification: string;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  organization: string;

  @Column({ type: 'varchar', nullable: true })
  postalCode: string;

  @Column({ type: 'varchar', nullable: true })
  city: string;

  @Column({ type: 'varchar', nullable: true })
  state: string;

  @Column({ type: 'varchar', nullable: true })
  country: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'boolean', default: false })
  external: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentBalance: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  accumulatedValue: number;

  @OneToMany(() => Ticket, (ticket) => ticket.customer)
  tickets: Ticket[];

  @Column({ type: 'json', nullable: true })
  raw: any;

  @OneToMany(() => Point, (point) => point.customer)
  points: Point[];

  @Column({ default: false })
  vip: boolean;

  @CreateDateColumn({ type: 'timestamptz', nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true })
  updatedAt: Date;
}
