import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Municipality } from './municipality.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @OneToMany(() => Municipality, (municipality) => municipality.department)
  municipalities: Municipality[];
}
