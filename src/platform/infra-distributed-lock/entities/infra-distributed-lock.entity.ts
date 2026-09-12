import { AbstractEntity } from '@common/entities/abstract.entity'
import { Column, Entity } from 'typeorm'

/**
 * Infrastructure entity for managing distributed locks across multiple application instances.
 * Each row represents a named lock identified by a unique key.
 * The `lockedUntil` column acts as a TTL-based expiry mechanism.
 */
@Entity('infra_distributed_locks')
export class InfraDistributedLock extends AbstractEntity {
  @Column({ unique: true })
  key: string

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date | null

  @Column({ type: 'uuid', nullable: true })
  ownerId: string | null
}
