import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Establishment } from './establishment.entity';

@Entity('establishment_invoice_counters')
@Unique(['establishmentId'])
export class EstablishmentInvoiceCounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Establishment, { eager: true })
  @JoinColumn()
  establishment: Establishment;

  @Column()
  establishmentId: string;

  @Column({ type: 'int', default: 0 })
  lastInvoiceNumber: number;

  @Column({ type: 'varchar', length: 10, default: 'FACT' })
  prefix: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
