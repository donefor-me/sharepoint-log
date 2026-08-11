import { Column, Entity } from 'typeorm'

import { AbstractEntity } from '../../../../common/entities/abstract.entity'
import { AuditLogDlqStatus } from '../constants/dlq-status.constant'

@Entity('audit_log_dlq')
export class AuditLogDlq extends AbstractEntity {
  @Column({ type: 'varchar', unique: true })
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
  errorReason: string | null

  @Column({ type: 'int', default: 0 })
  retryCount: number
}
