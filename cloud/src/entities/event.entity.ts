import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Session } from './session.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    type: 'enum', 
    enum: ['text_input', 'ui_result', 'system'],
    comment: 'Event type per canonical contract'
  })
  type: 'text_input' | 'ui_result' | 'system';

  @Column({ 
    type: 'jsonb',
    comment: 'Event payload per canonical contract'
  })
  payload: Record<string, any>;

  @Column({ 
    type: 'varchar', 
    length: 50,
    nullable: true,
    comment: 'Agent identifier that sent this event'
  })
  agent_id: string;

  @Column({ 
    type: 'timestamp',
    comment: 'When event occurred (per canonical contract)'
  })
  timestamp: Date;

  @Column({ 
    type: 'varchar', 
    length: 50,
    nullable: true,
    comment: 'Processing status of this event'
  })
  processing_status: 'pending' | 'processed' | 'error' | 'ignored';

  @Column({ 
    type: 'timestamp',
    nullable: true,
    comment: 'When event was processed'
  })
  processed_at: Date;

  @Column({ 
    type: 'jsonb',
    nullable: true,
    comment: 'Processing result or error details'
  })
  processing_result: Record<string, any>;

  @CreateDateColumn({ 
    type: 'timestamp',
    comment: 'When event was created in database'
  })
  created_at: Date;

  // Relations
  @ManyToOne(() => Session, session => session.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ 
    type: 'uuid', 
    comment: 'Session this event belongs to'
  })
  session_id: string;
}