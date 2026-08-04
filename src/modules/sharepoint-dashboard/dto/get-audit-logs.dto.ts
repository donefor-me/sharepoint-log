import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'

export const GetAuditLogsSchema = z.object({
  operation: z.string().optional(),
  userId: z.string().optional(),
  workload: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).default(10),
})

export class GetAuditLogsDto extends createZodDto(GetAuditLogsSchema) {}
