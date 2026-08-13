import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const LoginSchema = z.object({
  username: z.string().min(3, 'Username is required'),
  password: z.string().min(8, 'Password is required'),
})

/**
 * Data Transfer Object for user login.
 */
export class LoginDto extends createZodDto(LoginSchema) {}
