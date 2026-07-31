import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SharepointTokenCache } from '../entities/sharepoint-token-cache.entity'
import { SharepointAuthResponseDto } from '../infrastructure/sharepoint-auth-response.dto'

const DEFAULT_CACHE_ID = 'DEFAULT'
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000 // 5 minutes buffer
const SECONDS_TO_MS_MULTIPLIER = 1000

@Injectable()
export class SharepointTokenCacheRepository {
  constructor(
    @InjectRepository(SharepointTokenCache)
    private readonly repository: Repository<SharepointTokenCache>,
  ) {}

  async getValidToken(): Promise<string | null> {
    const cache = await this.repository.findOne({
      where: { id: DEFAULT_CACHE_ID },
    })
    const now = Date.now()

    if (
      cache &&
      Number(cache.calculatedExpiresAt) > now + TOKEN_EXPIRY_BUFFER_MS
    ) {
      return cache.accessToken
    }
    return null
  }

  async saveToken(data: SharepointAuthResponseDto): Promise<void> {
    const newCache = new SharepointTokenCache()
    newCache.id = DEFAULT_CACHE_ID
    newCache.accessToken = data.access_token
    newCache.tokenType = data.token_type
    newCache.expiresIn = data.expires_in
    newCache.calculatedExpiresAt =
      Date.now() + data.expires_in * SECONDS_TO_MS_MULTIPLIER

    await this.repository.save(newCache)
  }
}
