import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { EnvironmentVariables } from '../../config/env.validation'
import { EncryptionError } from './encryption.exception'

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

  constructor(private configService: ConfigService<EnvironmentVariables>) {
    const secret = this.configService.getOrThrow<string>('TOKEN_ENCRYPTION_KEY')
    this.key = crypto.scryptSync(secret, this.KDF_SALT, this.KEY_LENGTH)
  }

  encrypt(text: string): string {
    if (!text) throw new EncryptionError('Text to encrypt cannot be empty')

    const iv = crypto.randomBytes(this.IV_LENGTH)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)

    const encryptedBuffer = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ])
    const authTag = cipher.getAuthTag()

    const combinedBuffer = Buffer.concat([iv, authTag, encryptedBuffer])
    return combinedBuffer.toString('base64')
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText) {
      throw new EncryptionError('Encrypted text cannot be empty')
    }

    try {
      const data = Buffer.from(encryptedText, 'base64')

      if (data.length < this.MINIMUM_PAYLOAD_LENGTH) {
        throw new EncryptionError('Invalid encrypted format')
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

      return decryptedBuffer.toString('utf8')
    } catch (error) {
      if (error instanceof EncryptionError) throw error
      throw new EncryptionError('Decryption failed')
    }
  }
}
