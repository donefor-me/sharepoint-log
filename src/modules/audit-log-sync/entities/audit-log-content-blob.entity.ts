import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

export enum BlobDownloadStatus {
  PENDING_DOWNLOAD = 'PENDING_DOWNLOAD',
  DOWNLOADED_SUCCESS = 'DOWNLOADED_SUCCESS',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
}

@Entity('audit_log_content_blobs')
export class AuditLogContentBlob {
  @PrimaryColumn()
  contentId: string

  @Column()
  contentUri: string

  @Column()
  contentType: string

  @Column({
    type: 'enum',
    enum: BlobDownloadStatus,
    default: BlobDownloadStatus.PENDING_DOWNLOAD,
  })
  status: BlobDownloadStatus

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
