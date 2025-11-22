import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Department } from './department.entity';

@Entity('municipalities')
export class Municipality {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'departmentCode', referencedColumnName: 'code' })
  department: Department;

  @Column()
  departmentCode: string;
}
