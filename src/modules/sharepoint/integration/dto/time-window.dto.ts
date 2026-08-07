import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const TimeWindowSchema = z
  .object({
    startTime: z
      .string()
      .datetime({ message: 'startTime must be a valid ISO datetime' })
      .optional(),
    endTime: z
      .string()
      .datetime({ message: 'endTime must be a valid ISO datetime' })
      .optional(),
  })
  .refine(
    (data) => {
      if (
        (data.startTime && !data.endTime) ||
        (!data.startTime && data.endTime)
      ) {
        return false
      }
      if (data.startTime && data.endTime) {
        return new Date(data.startTime) < new Date(data.endTime)
      }
      return true
    },
    {
      message:
        'Both startTime and endTime must be provided together, and startTime must be before endTime',
    },
  )

export class TimeWindowDto extends createZodDto(TimeWindowSchema) {}
