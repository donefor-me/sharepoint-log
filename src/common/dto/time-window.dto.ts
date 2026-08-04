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
      // Nếu có 1 trong 2 mà thiếu cái còn lại -> Lỗi
      if (
        (data.startTime && !data.endTime) ||
        (!data.startTime && data.endTime)
      ) {
        return false
      }
      // Nếu có cả 2 -> Validate logic thời gian
      if (data.startTime && data.endTime) {
        return new Date(data.startTime) < new Date(data.endTime)
      }
      // Bỏ trống cả 2 -> Hợp lệ
      return true
    },
    {
      message:
        'Both startTime and endTime must be provided together, and startTime must be before endTime',
    },
  )

export type TimeWindowDto = z.infer<typeof TimeWindowSchema>
