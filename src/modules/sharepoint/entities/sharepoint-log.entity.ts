import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm'

@Entity('sharepoint_log')
export class SharepointLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  action: string

  @Column({ nullable: true })
  details: string

  @CreateDateColumn()
  createdAt: Date
}
