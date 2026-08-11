import { z } from 'zod'

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number(),
    DB_HOST: z.string(),
    DB_PORT: z.coerce.number(),
    DB_USER: z.string(),
    DB_PASS: z.string(),
    DB_NAME: z.string(),
    O365_TENANT_ID: z.string(),
    O365_CLIENT_ID: z.string(),
    O365_CLIENT_SECRET: z.string(),
    TOKEN_ENCRYPTION_KEY: z
      .string()
      .min(16, 'Must be at least 16 characters')
      .max(128, 'Max 128 characters'),
    JWT_SECRET: z.string().min(8),
    CORS_ORIGIN: z.string().transform((v) => v.split(',').map((s) => s.trim())),
    ADMIN_DEFAULT_PASSWORD: z.string().optional(),
  })
  .refine((env) => Buffer.byteLength(env.TOKEN_ENCRYPTION_KEY, 'utf-8') >= 32, {
    message: 'TOKEN_ENCRYPTION_KEY must encode to at least 32 bytes',
  })
export type EnvironmentVariables = z.infer<typeof envSchema>

/**
 * Validates the environment variables against the defined schema.
 *
 * @param {Record<string, unknown>} config - The raw configuration object to validate.
 * @returns {EnvironmentVariables} The validated and typed environment variables.
 * @throws {Error} If validation fails.
 */
export function validate(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config)

  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`)
  }

  return result.data
}
