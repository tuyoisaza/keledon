import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Session } from './session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    type: 'varchar', 
    length: 255,
    unique: true,
    comment: 'User email address'
  })
  email: string;

  @Column({ 
    type: 'varchar', 
    length: 255,
    nullable: true,
    comment: 'User display name'
  })
  name: string;

  @Column({ 
    type: 'varchar', 
    length: 20,
    default: 'active',
    comment: 'User account status'
  })
  status: 'active' | 'inactive' | 'suspended';

  @Column({ 
    type: 'text',
    nullable: true,
    comment: 'User preferences and settings'
  })
  preferences: Record<string, any>;

  @CreateDateColumn({ 
    type: 'timestamp',
    comment: 'When user was created'
  })
  created_at: Date;

  @UpdateDateColumn({ 
    type: 'timestamp',
    comment: 'When user was last updated'
  })
  updated_at: Date;

  // Relations
  @OneToMany(() => Session, session => session.user)
  sessions: Session[];
}