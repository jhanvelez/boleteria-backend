import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Permission } from '../../permissions/entities/permission.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Permission, { cascade: true })
  @JoinTable()
  permissions: Permission[];

  @OneToMany(() => User, (user) => user.roles)
  users: User[];
}
