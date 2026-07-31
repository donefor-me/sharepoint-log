import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_USER: z.string(),
  DB_PASS: z.string(),
  DB_NAME: z.string(),
  O365_TENANT_ID: z.string(),
  O365_CLIENT_ID: z.string(),
  O365_CLIENT_SECRET: z.string(),
})

export type EnvironmentVariables = z.infer<typeof envSchema>

export function validate(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config)

  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`)
  }

  return result.data
}
