import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Warehouse } from './warehouse.entity';

@Entity('stock')
export class Stock {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Warehouse, (w) => w.stock)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column()
  amount: number;
}
