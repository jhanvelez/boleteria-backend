import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Establishment } from 'src/establishments/entities/establishment.entity';

@Entity('premises')
export class Premise {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  numero_local: string;

  @Column({ type: 'varchar', length: 20, default: 'DISPONIBLE' })
  estado_local: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  clase_local: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  nivel: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tipoplaza: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  area: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ficha_catastro: string;

  @Column({ type: 'text', nullable: true })
  destinacion: string;

  @OneToMany(() => Establishment, (establishment) => establishment.premise)
  establishments: Establishment[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
