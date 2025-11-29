import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Purchase } from 'src/purchases/entities/purchase.entity';
import { Premise } from 'src/premise/entities/premise.entity';

@Entity('establishments')
export class Establishment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nombre_comercial', length: 100 })
  nombreComercial: string;

  @Column({ nullable: true })
  categoria: string;

  @Column({ name: 'activo_inactivo', default: true })
  activoInactivo: boolean;

  @Column({ name: 'telefono1', nullable: true })
  telefono1: string;

  @Column({ name: 'telefono2', nullable: true })
  telefono2: string;

  @Column({ name: 'telefono3', nullable: true })
  telefono3: string;

  @Column({ name: 'fecha_apertura', type: 'date', nullable: true })
  fechaApertura: Date;

  @Column({ name: 'fecha_cierre', type: 'date', nullable: true })
  fechaCierre: Date;

  @Column({ nullable: true })
  website: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  area: number;

  @Column({ name: 'ficha_catastro', nullable: true })
  fichaCatastro: string;

  @ManyToOne(() => Premise, (premise) => premise.establishments, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'premise_id' })
  premise: Premise;

  @Column({ name: 'premise_id' })
  premiseId: number;

  @OneToMany(() => Purchase, (purchase) => purchase.establishment)
  purchases: Purchase[];

  @Column({ default: false })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
