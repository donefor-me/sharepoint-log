import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm'
import type { Office365WorkloadType } from '../workload.constant'

@Entity('audit_logs')
export class AuditLog {
  @PrimaryColumn('uuid')
  id: string

  @Column({ nullable: true })
  contentId: string

  @Column({ nullable: true })
  creationTime: string

  @Column({ nullable: true })
  operation: string

  /**
   * Office 365 service categorization (e.g., SharePoint, Exchange).
   * @see Office365Workload
   */
  @Column({ type: 'varchar', nullable: true })
  workload: Office365WorkloadType

  @Column({ nullable: true })
  userId: string

  @Column('jsonb', { nullable: true })
  rawData: Record<string, unknown>

  @CreateDateColumn()
  createdAt: Date
}
