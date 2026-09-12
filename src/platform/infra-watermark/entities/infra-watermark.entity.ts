import { AbstractEntity } from '@common/entities/abstract.entity'
import { Column, Entity } from 'typeorm'

/**
 * Infrastructure entity for persisting sync watermarks (cursor timestamps).
 * Each row stores the last successfully processed timestamp for a named sync job,
 * identified by a unique key.
 */
@Entity('infra_watermarks')
export class InfraWatermark extends AbstractEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  key: string

  @Column({ type: 'timestamp', nullable: true })
  timestampValue: Date | null
}
