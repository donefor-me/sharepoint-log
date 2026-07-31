import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@Entity('sharepoint_token_cache')
export class SharepointTokenCache {
  @PrimaryColumn()
  id: string

  @Column({ type: 'text' })
  accessToken: string

  @Column({ type: 'varchar', length: 50 })
  tokenType: string

  @Column({ type: 'int' })
  expiresIn: number

  @Column({ type: 'bigint' })
  calculatedExpiresAt: number

  @UpdateDateColumn()
  updatedAt: Date
}
