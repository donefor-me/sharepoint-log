import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { SHAREPOINT_OPERATIONS } from '../../constants/sharepoint-operations.constant'

export const GetAuditLogsSchema = z
  .object({
    operation: z
      .string()
      .transform((val) =>
        val
          .split(',')
          .map((op) => op.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.enum(SHAREPOINT_OPERATIONS)).min(1))
      .optional(),
    userId: z.string().optional(),
    userName: z.string().optional(),
    fileName: z.string().optional(),
    workload: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).default(10),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) {
        return true
      }

      return new Date(data.startDate) <= new Date(data.endDate)
    },
    {
      message: 'startDate must be before or equal to endDate',
      path: ['startDate'],
    },
  )

export class GetAuditLogsDto extends createZodDto(GetAuditLogsSchema) {}
