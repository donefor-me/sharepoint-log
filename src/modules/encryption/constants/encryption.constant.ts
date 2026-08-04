export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'aes-256-gcm',
  IV_LENGTH: 12,
  AUTH_TAG_LENGTH: 16,
  KDF_SALT: 'encryption-service-v1',
  KEY_LENGTH: 32,
} as const
