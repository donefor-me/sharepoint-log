import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'

import { AuditLogDlqStatus } from '../constants/dlq-status.constant'

@Entity('audit_log_dlq')
export class AuditLogDlq {
  @PrimaryColumn({ type: 'varchar' })
  contentUri: string

  @Column({ type: 'varchar' })
  contentId: string

  @Column({
    type: 'enum',
    enum: AuditLogDlqStatus,
    default: AuditLogDlqStatus.PENDING,
  })
  status: AuditLogDlqStatus

  @Column({ type: 'text', nullable: true })
  errorReason: string

  @Column({ type: 'int', default: 0 })
  retryCount: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
