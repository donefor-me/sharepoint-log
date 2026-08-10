import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm'

import type { Office365WorkloadType } from '../constants/workload.constant'

@Entity('audit_logs')
@Index(['creationTime', 'operation'])
export class AuditLog {
  @PrimaryColumn('uuid')
  id: string

  @Column({ nullable: true })
  contentId: string

  @Index()
  @Column({ type: 'timestamp', nullable: true })
  creationTime: Date

  @Index()
  @Column({ nullable: true })
  operation: string

  /**
   * Office 365 service categorization (e.g., SharePoint, Exchange).
   * @see Office365Workload
   */
  @Index()
  @Column({ type: 'varchar', nullable: true })
  workload: Office365WorkloadType

  @Index()
  @Column({ nullable: true })
  userId: string

  @Column({ nullable: true })
  objectId: string

  @Column({ nullable: true })
  itemName: string

  @Column({ type: 'jsonb', nullable: true })
  rawData: Record<string, unknown>

  @CreateDateColumn()
  createdAt: Date
}
