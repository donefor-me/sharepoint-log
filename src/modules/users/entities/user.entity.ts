import { Column, Entity } from 'typeorm'

import { AbstractEntity } from '../../../common/entities/abstract.entity'

@Entity('users')
export class User extends AbstractEntity {
  @Column({ unique: true })
  username: string

  @Column()
  password?: string
}
