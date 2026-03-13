import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Session } from './session.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    type: 'varchar', 
    length: 20,
    comment: 'Event type per canonical contract'
  })
  type: 'text_input' | 'ui_result' | 'system';

  @Column({ 
    type: 'text',
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
    type: 'datetime',
    comment: 'When event occurred (per canonical contract)'
  })
  datetime: Date;

  @Column({ 
    type: 'varchar', 
    length: 20,
    nullable: true,
    comment: 'Processing status of this event'
  })
  processing_status: 'pending' | 'processed' | 'error' | 'ignored';

  @Column({ 
    type: 'datetime',
    nullable: true,
    comment: 'When event was processed'
  })
  processed_at: Date;

  @Column({ 
    type: 'text',
    nullable: true,
    comment: 'Processing result or error details'
  })
  processing_result: Record<string, any>;

  @CreateDateColumn({ 
    type: 'datetime',
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