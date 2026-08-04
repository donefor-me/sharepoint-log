import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { EnvironmentVariables } from '@config/env.validation'
import { Logger } from '@common/logger'
import { EncryptionException } from '@common/exceptions'
import { ENCRYPTION_CONFIG } from './constants/encryption.constant'

@Injectable()
export class EncryptionService {
  private readonly MINIMUM_PAYLOAD_LENGTH =
    ENCRYPTION_CONFIG.IV_LENGTH + ENCRYPTION_CONFIG.AUTH_TAG_LENGTH
  private readonly key: Buffer

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(EncryptionService.name)
    const secret = this.configService.getOrThrow<string>('TOKEN_ENCRYPTION_KEY')
    this.key = crypto.scryptSync(
      secret,
      ENCRYPTION_CONFIG.KDF_SALT,
      ENCRYPTION_CONFIG.KEY_LENGTH,
    )
  }

  encrypt(text: string): string {
    if (!text) throw new EncryptionException('Text to encrypt cannot be empty')
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.IV_LENGTH)
    const cipher = crypto.createCipheriv(
      ENCRYPTION_CONFIG.ALGORITHM,
      this.key,
      iv,
    )
    const encryptedBuffer = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ])
    const authTag = cipher.getAuthTag()
    return Buffer.concat([iv, authTag, encryptedBuffer]).toString('base64')
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText) {
      throw new EncryptionException('Encrypted text cannot be empty')
    }
    try {
      const data = Buffer.from(encryptedText, 'base64')
      if (data.length < this.MINIMUM_PAYLOAD_LENGTH) {
        throw new EncryptionException('Invalid encrypted format')
      }
      const iv = data.subarray(0, ENCRYPTION_CONFIG.IV_LENGTH)
      const authTag = data.subarray(
        ENCRYPTION_CONFIG.IV_LENGTH,
        this.MINIMUM_PAYLOAD_LENGTH,
      )
      const encrypted = data.subarray(this.MINIMUM_PAYLOAD_LENGTH)
      const decipher = crypto.createDecipheriv(
        ENCRYPTION_CONFIG.ALGORITHM,
        this.key,
        iv,
      )
      decipher.setAuthTag(authTag)
      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString('utf8')
    } catch (error) {
      if (error instanceof EncryptionException) throw error
      throw new EncryptionException('Decryption failed')
    }
  }
}
