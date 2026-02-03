import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Event } from './event.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    type: 'varchar', 
    length: 255,
    nullable: true,
    comment: 'Human-readable session identifier'
  })
  name: string;

  @Column({ 
    type: 'enum', 
    enum: ['active', 'paused', 'ended', 'error'],
    default: 'active',
    comment: 'Current session status'
  })
  status: 'active' | 'paused' | 'ended' | 'error';

  @Column({ 
    type: 'varchar', 
    length: 50,
    nullable: true,
    comment: 'Agent identifier that owns this session'
  })
  agent_id: string;

  @Column({ 
    type: 'jsonb',
    nullable: true,
    comment: 'Session metadata and configuration'
  })
  metadata: Record<string, any>;

  @Column({ 
    type: 'timestamp',
    nullable: true,
    comment: 'When session started'
  })
  started_at: Date;

  @Column({ 
    type: 'timestamp',
    nullable: true,
    comment: 'When session ended'
  })
  ended_at: Date;

  @Column({ 
    type: 'timestamp',
    nullable: true,
    comment: 'Last activity timestamp'
  })
  last_activity_at: Date;

  @Column({ 
    type: 'integer',
    default: 0,
    comment: 'Number of events in this session'
  })
  event_count: number;

  @CreateDateColumn({ 
    type: 'timestamp',
    comment: 'When session was created'
  })
  created_at: Date;

  @UpdateDateColumn({ 
    type: 'timestamp',
    comment: 'When session was last updated'
  })
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, user => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ 
    type: 'uuid', 
    nullable: true,
    comment: 'User who owns this session'
  })
  user_id: string;

  @OneToMany(() => Event, event => event.session)
  events: Event[];
}