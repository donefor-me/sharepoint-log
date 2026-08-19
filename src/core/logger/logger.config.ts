import { EnvironmentVariables } from '@core/config/env.validation'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'crypto'
import { Params } from 'nestjs-pino'

const MAX_STACK_LINES = 5

function truncateStack(stack: string | undefined): string | undefined {
  if (!stack) return stack
  const lines = stack.split('\n')
  if (lines.length <= MAX_STACK_LINES) return stack
  const omitted = lines.length - MAX_STACK_LINES
  return `${lines.slice(0, MAX_STACK_LINES).join('\n')}\n    ... (${omitted} more lines)`
}

const configService: ConfigService<EnvironmentVariables, true> =
  new ConfigService()

export const loggerConfig: Params = {
  pinoHttp: {
    genReqId: (req) =>
      (req.headers['x-correlation-id'] as string) || randomUUID(),
    autoLogging: {
      ignore: (_req) => false,
    },
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error'
      if (res.statusCode >= 400) return 'warn'
      return 'silent'
    },
    customErrorObject: (_req, res, error: Error) => {
      const isServerError = res.statusCode >= 500
      return {
        err: isServerError
          ? {
              type: (error as any).type ?? error.name,
              message: error.message,
              stack: truncateStack(error.stack),
            }
          : {
              type: (error as any).type ?? error.name,
              message: error.message,
            },
      }
    },
    transport:
      configService.get('NODE_ENV', { infer: true }) === 'production'
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              colorize: true,
            },
          },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'body.password',
        'body.token',
      ],
      censor: '[REDACTED]',
    },
    serializers: {
      // err: stdSerializers.err,
      err: (err: unknown) => {
        if (!(err instanceof Error)) return err
        return {
          type: (err as any).type ?? err.name,
          message: err.message,
          stack: truncateStack(err.stack),
        }
      },
    },
  },
}
