import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import {
  AuditLogContentBlob,
  BlobDownloadStatus,
} from '../entities/audit-log-content-blob.entity'

const SAVE_CHUNK_SIZE = 1000

@Injectable()
export class AuditLogBlobRepository {
  constructor(
    @InjectRepository(AuditLogContentBlob)
    private readonly repository: Repository<AuditLogContentBlob>,
  ) {}

  async findByContentIds(contentIds: string[]): Promise<AuditLogContentBlob[]> {
    return this.repository.find({
      where: { contentId: In(contentIds) },
    })
  }

  create(data: Partial<AuditLogContentBlob>): AuditLogContentBlob {
    return this.repository.create(data)
  }

  async saveMany(blobs: AuditLogContentBlob[]): Promise<void> {
    for (let i = 0; i < blobs.length; i += SAVE_CHUNK_SIZE) {
      await this.repository.save(blobs.slice(i, i + SAVE_CHUNK_SIZE))
    }
  }

  async updateStatus(
    contentId: string,
    status: BlobDownloadStatus,
  ): Promise<void> {
    await this.repository.update(contentId, { status })
  }

  async bulkUpdateStatus(
    contentIds: string[],
    status: BlobDownloadStatus,
  ): Promise<void> {
    if (contentIds.length === 0) return
    await this.repository
      .createQueryBuilder()
      .update(AuditLogContentBlob)
      .set({ status })
      .whereInIds(contentIds)
      .execute()
  }
}
