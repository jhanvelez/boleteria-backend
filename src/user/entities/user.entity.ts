import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Loan } from './loan.entity';
import { Notification } from '../../notification/entities/notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  documentType: string;

  @Column({ unique: true })
  documentId: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'date', nullable: true })
  serviceStartSate: Date;

  @Column({ default: false })
  isEmailConfirmed: boolean;

  @ManyToMany(() => Role, { eager: true })
  @JoinTable()
  roles: Role[];

  @OneToMany(() => Loan, (loan) => loan.user)
  loans: Loan[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
