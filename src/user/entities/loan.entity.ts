import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { LoanType } from './loan-type.entity';
import { LoanedItem } from './loaned-item.entity';

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.loans)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => LoanType, (type) => type.loans)
  @JoinColumn({ name: 'loan_type_id' })
  loanType: LoanType;

  @Column({ type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => LoanedItem, (li) => li.loan)
  loanedItems: LoanedItem[];
}
