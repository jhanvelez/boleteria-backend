import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Loan } from './loan.entity';
import { Warehouse } from './warehouse.entity';

@Entity('loaned_items')
export class LoanedItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Loan, (loan) => loan.loanedItems)
  @JoinColumn({ name: 'loan_id' })
  loan: Loan;

  @Column()
  amount: number;

  @ManyToOne(() => Warehouse, (w) => w.loanedItems)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;
}
