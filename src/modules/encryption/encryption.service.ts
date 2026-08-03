import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { EnvironmentVariables } from '../../config/env.validation'
import { Logger } from 'src/common/logger/logger.service'
import { EncryptionException } from 'src/common/exceptions'

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly IV_LENGTH = 12
  private readonly AUTH_TAG_LENGTH = 16
  private readonly MINIMUM_PAYLOAD_LENGTH =
    this.IV_LENGTH + this.AUTH_TAG_LENGTH
  private readonly KDF_SALT = 'encryption-service-v1'
  private readonly KEY_LENGTH = 32
  private readonly key: Buffer

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(EncryptionService.name)
    const secret = this.configService.getOrThrow<string>('TOKEN_ENCRYPTION_KEY')
    this.key = crypto.scryptSync(secret, this.KDF_SALT, this.KEY_LENGTH)
    this.logger.log('Encryption key initialized')
  }

  encrypt(text: string): string {
    if (!text) throw new EncryptionException('Text to encrypt cannot be empty')

    this.logger.debug(`Encrypting text, length: ${text.length}`)
    const iv = crypto.randomBytes(this.IV_LENGTH)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)

    const encryptedBuffer = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ])
    const authTag = cipher.getAuthTag()

    const combinedBuffer = Buffer.concat([iv, authTag, encryptedBuffer])
    const result = combinedBuffer.toString('base64')

    this.logger.debug(`Encrypted successfully, output length: ${result.length}`)
    return result
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText) {
      throw new EncryptionException('Encrypted text cannot be empty')
    }

    this.logger.debug(`Decrypting payload, length: ${encryptedText.length}`)
    try {
      const data = Buffer.from(encryptedText, 'base64')

      if (data.length < this.MINIMUM_PAYLOAD_LENGTH) {
        this.logger.warn(
          `Decryption failed: payload too short (${data.length} bytes)`,
        )
        throw new EncryptionException('Invalid encrypted format')
      }

      const iv = data.subarray(0, this.IV_LENGTH)
      const authTag = data.subarray(this.IV_LENGTH, this.MINIMUM_PAYLOAD_LENGTH)
      const encrypted = data.subarray(this.MINIMUM_PAYLOAD_LENGTH)

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv)
      decipher.setAuthTag(authTag)

      const decryptedBuffer = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ])

      this.logger.debug('Decrypted successfully')
      return decryptedBuffer.toString('utf8')
    } catch (error) {
      if (error instanceof EncryptionException) throw error
      this.logger.error(`Decryption error: ${(error as Error).name}`)
      throw new EncryptionException('Decryption failed')
    }
  }
}
