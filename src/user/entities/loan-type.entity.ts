import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Loan } from './loan.entity';

@Entity('loan_types')
export class LoanType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Loan, (loan) => loan.loanType)
  loans: Loan[];
}
