import { Column, Entity } from 'typeorm'

import { AbstractEntity } from '../../../../common/entities/abstract.entity'

@Entity('sharepoint_token_cache')
export class SharepointTokenCache extends AbstractEntity {
  @Column({ type: 'text' })
  accessToken: string

  @Column({ type: 'varchar', length: 50 })
  tokenType: string

  @Column({ type: 'int' })
  expiresIn: number

  @Column({ type: 'bigint' })
  calculatedExpiresAt: number
}
