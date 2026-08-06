import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { EncryptionService } from '../../encryption/encryption.service'
import { SharepointAuthResponseDto } from '../dto/sharepoint-auth-response.dto'
import { SharepointTokenCache } from '../entities/sharepoint-token-cache.entity'

const DEFAULT_CACHE_ID = 'DEFAULT'
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000
const SECONDS_TO_MS_MULTIPLIER = 1000

@Injectable()
export class SharepointTokenCacheRepository {
  /**
   * Initializes the SharepointTokenCacheRepository.
   *
   * @param {Repository<SharepointTokenCache>} repository - The TypeORM repository for managing token cache entries in the database.
   * @param {EncryptionService} encryptionService - Service used to encrypt and decrypt the token before storing or after retrieving.
   * @returns {void}
   */
  constructor(
    @InjectRepository(SharepointTokenCache)
    private readonly repository: Repository<SharepointTokenCache>,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Retrieves a valid SharePoint authentication token from the cache.
   * Ensures the token is decrypted and has not expired (with a safety buffer).
   *
   * @returns {Promise<string | null>} - A promise that resolves with the decrypted valid token, or null if it does not exist or has expired.
   */
  async getValidToken(): Promise<string | null> {
    const cache = await this.repository.findOne({
      where: { id: DEFAULT_CACHE_ID },
    })
    const now = Date.now()
    if (
      cache &&
      Number(cache.calculatedExpiresAt) > now + TOKEN_EXPIRY_BUFFER_MS
    ) {
      return this.encryptionService.decrypt(cache.accessToken)
    }
    return null
  }

  /**
   * Encrypts and saves a new SharePoint authentication token to the database cache.
   * Calculates the exact expiration timestamp based on the expiresIn property.
   *
   * @param {SharepointAuthResponseDto} data - The authentication response payload from SharePoint.
   * @returns {Promise<void>}
   */
  async saveToken(data: SharepointAuthResponseDto): Promise<void> {
    const newCache = new SharepointTokenCache()
    newCache.id = DEFAULT_CACHE_ID
    newCache.accessToken = this.encryptionService.encrypt(data.access_token)
    newCache.tokenType = data.token_type
    newCache.expiresIn = data.expires_in
    newCache.calculatedExpiresAt =
      Date.now() + data.expires_in * SECONDS_TO_MS_MULTIPLIER
    await this.repository.save(newCache)
  }
}
