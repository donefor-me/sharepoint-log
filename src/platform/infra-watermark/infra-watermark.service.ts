import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { InfraWatermark } from './entities/infra-watermark.entity'

/**
 * Infrastructure service for reading and writing sync watermarks.
 * A watermark is a named timestamp cursor indicating the last successfully
 * processed point in a data ingestion pipeline.
 */
@Injectable()
export class InfraWatermarkService {
  constructor(
    @InjectRepository(InfraWatermark)
    private readonly repo: Repository<InfraWatermark>,
  ) {}

  /**
   * Retrieves the current watermark timestamp for a given key.
   *
   * @param {string} key - The unique identifier for the watermark.
   * @returns {Promise<Date | null>} - The stored timestamp, or null if not yet set.
   */
  async getWatermark(key: string): Promise<Date | null> {
    const row = await this.repo.findOne({ where: { key } })
    return row?.timestampValue ?? null
  }

  /**
   * Persists (upserts) a watermark timestamp for a given key.
   *
   * @param {string} key - The unique identifier for the watermark.
   * @param {Date} timestamp - The timestamp to store as the new watermark.
   * @returns {Promise<void>}
   */
  async setWatermark(key: string, timestamp: Date): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(InfraWatermark)
      .values({ key, timestampValue: timestamp })
      .orUpdate(['timestamp_value', 'updated_at'], ['key'])
      .execute()
  }
}
