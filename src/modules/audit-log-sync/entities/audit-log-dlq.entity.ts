import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { AuditLogDlqStatus } from '../constants/dlq-status.constant'

@Entity('audit_log_dlq')
export class AuditLogDlq {
  @PrimaryColumn({ name: 'content_uri', type: 'varchar' })
  contentUri: string

  @Column({ name: 'content_id', type: 'varchar' })
  contentId: string

  @Column({
    name: 'status',
    type: 'varchar',
    default: AuditLogDlqStatus.PENDING,
  })
  status: AuditLogDlqStatus

  @Column({ name: 'error_reason', type: 'text', nullable: true })
  errorReason: string

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
