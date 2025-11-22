import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('raffles')
export class Raffle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'timestamp', nullable: true })
  startDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date;

  @Column({ default: 'pending' })
  status: 'pending' | 'active' | 'finished';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
