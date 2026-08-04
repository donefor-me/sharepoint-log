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
  /**
   * Initializes the AuditLogBlobRepository with the TypeORM repository.
   *
   * @param {Repository<AuditLogContentBlob>} repository - The TypeORM repository for AuditLogContentBlob entities.
   * @returns {void}
   */
  constructor(
    @InjectRepository(AuditLogContentBlob)
    private readonly repository: Repository<AuditLogContentBlob>,
  ) {}

  /**
   * Finds and returns a list of blob entities matching the provided content IDs.
   *
   * @param {string[]} contentIds - An array of unique content IDs to search for.
   * @returns {Promise<AuditLogContentBlob[]>} - A promise resolving to an array of matching blob entities.
   */
  async findByContentIds(contentIds: string[]): Promise<AuditLogContentBlob[]> {
    return this.repository.find({
      where: { contentId: In(contentIds) },
    })
  }

  /**
   * Creates a new AuditLogContentBlob entity instance without saving it to the database.
   *
   * @param {Partial<AuditLogContentBlob>} data - The partial data to instantiate the blob entity with.
   * @returns {AuditLogContentBlob} - The newly created blob entity instance.
   */
  create(data: Partial<AuditLogContentBlob>): AuditLogContentBlob {
    return this.repository.create(data)
  }

  /**
   * Saves an array of blob entities to the database in chunks to avoid overwhelming the connection.
   *
   * @param {AuditLogContentBlob[]} blobs - The array of blob entities to save.
   * @returns {Promise<void>}
   */
  async saveMany(blobs: AuditLogContentBlob[]): Promise<void> {
    for (let i = 0; i < blobs.length; i += SAVE_CHUNK_SIZE) {
      await this.repository.save(blobs.slice(i, i + SAVE_CHUNK_SIZE))
    }
  }

  /**
   * Updates the download status of a single blob entity identified by its content ID.
   *
   * @param {string} contentId - The unique ID of the blob to update.
   * @param {BlobDownloadStatus} status - The new status to apply.
   * @returns {Promise<void>}
   */
  async updateStatus(
    contentId: string,
    status: BlobDownloadStatus,
  ): Promise<void> {
    await this.repository.update(contentId, { status })
  }

  /**
   * Performs a bulk update of the download status for multiple blobs at once.
   * Uses a single query to update all matching records efficiently.
   *
   * @param {string[]} contentIds - An array of unique IDs for the blobs to update.
   * @param {BlobDownloadStatus} status - The new status to apply to all specified blobs.
   * @returns {Promise<void>}
   */
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
