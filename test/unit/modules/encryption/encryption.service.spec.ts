import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'

import { EncryptionService } from '../../../../src/modules/encryption/encryption.service'
import { EncryptionException } from '../../../../src/modules/encryption/exceptions/encryption.exception'

describe('EncryptionService', () => {
  let service: EncryptionService
  let configService: jest.Mocked<ConfigService>

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    }

    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'TOKEN_ENCRYPTION_KEY')
        return 'test-secret-key-that-is-long-enough'
      return null
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<EncryptionService>(EncryptionService)
    configService = module.get(ConfigService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
    expect(jest.spyOn(configService, 'get')).toHaveBeenCalledWith(
      'TOKEN_ENCRYPTION_KEY',
      {
        infer: true,
      },
    )
  })

  describe('encrypt', () => {
    it('should successfully encrypt a plain text', () => {
      const plainText = 'sensitive-data'
      const encrypted = service.encrypt(plainText)

      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toBe(plainText)
    })

    it('should throw EncryptionException if text is empty', () => {
      expect(() => service.encrypt('')).toThrow(EncryptionException)
      expect(() => service.encrypt('')).toThrow(
        'Text to encrypt cannot be empty',
      )
    })
  })

  describe('decrypt', () => {
    it('should successfully decrypt a valid encrypted text', () => {
      const plainText = 'sensitive-data'
      const encrypted = service.encrypt(plainText)
      const decrypted = service.decrypt(encrypted)

      expect(decrypted).toBe(plainText)
    })

    it('should throw EncryptionException if encryptedText is empty', () => {
      expect(() => service.decrypt('')).toThrow(EncryptionException)
      expect(() => service.decrypt('')).toThrow(
        'Encrypted text cannot be empty',
      )
    })

    it('should throw EncryptionException if encrypted format is invalid (too short)', () => {
      const shortBuffer = Buffer.from('short', 'utf8').toString('base64')
      expect(() => service.decrypt(shortBuffer)).toThrow(EncryptionException)
      expect(() => service.decrypt(shortBuffer)).toThrow(
        'Invalid encrypted format',
      )
    })

    it('should throw EncryptionException if decryption fails (tampered data)', () => {
      const encrypted = service.encrypt('sensitive-data')
      // Tamper with the base64 string
      const tampered = encrypted.substring(0, encrypted.length - 5) + 'AAAAA'

      expect(() => service.decrypt(tampered)).toThrow(EncryptionException)
      expect(() => service.decrypt(tampered)).toThrow('Decryption failed')
    })
  })
})
