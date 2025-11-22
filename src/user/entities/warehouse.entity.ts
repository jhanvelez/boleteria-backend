import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { LoanedItem } from './loaned-item.entity';
import { Stock } from './stock.entity';

@Entity('warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => LoanedItem, (li) => li.warehouse)
  loanedItems: LoanedItem[];

  @OneToMany(() => Stock, (stock) => stock.warehouse)
  stock: Stock[];
}
