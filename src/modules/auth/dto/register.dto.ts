import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const RegisterSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

/**
 * Data Transfer Object for user registration.
 */
export class RegisterDto extends createZodDto(RegisterSchema) {}
