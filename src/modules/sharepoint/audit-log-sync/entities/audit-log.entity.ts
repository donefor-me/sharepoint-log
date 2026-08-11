import { Column, Entity, Index } from 'typeorm'

import { AbstractEntity } from '../../../../common/entities/abstract.entity'
import type { Office365WorkloadType } from '../constants/workload.constant'

@Entity('audit_logs')
export class AuditLog extends AbstractEntity {
  @Column({ unique: true })
  microsoftId: string

  @Column({ type: 'varchar', nullable: true })
  contentId: string | null

  @Index()
  @Column({ type: 'timestamp', nullable: true })
  creationTime: Date | null

  @Column({ type: 'varchar', nullable: true })
  operation: string | null

  /**
   * Office 365 service categorization (e.g., SharePoint, Exchange).
   * @see Office365Workload
   */
  @Column({ type: 'varchar', nullable: true })
  workload: Office365WorkloadType | null

  @Index()
  @Column({ type: 'varchar', nullable: true })
  userId: string | null

  @Column({ type: 'varchar', nullable: true })
  objectId: string | null

  @Column({ type: 'varchar', nullable: true })
  itemName: string | null

  @Column({ type: 'jsonb', nullable: true })
  rawData: Record<string, unknown> | null
}
