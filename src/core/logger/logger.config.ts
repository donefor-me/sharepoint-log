import { EnvironmentVariables } from '@core/config/env.validation'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'crypto'
import { Params } from 'nestjs-pino'
import { stdSerializers } from 'pino'

export function getLoggerConfig(
  configService: ConfigService<EnvironmentVariables, true>,
): Params {
  const isProd = configService.get('NODE_ENV', { infer: true }) === 'production'

  return {
    pinoHttp: {
      genReqId: (req) =>
        (req.headers['x-correlation-id'] as string) || randomUUID(),
      autoLogging: {
        ignore: () => false,
      },
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error'
        if (res.statusCode >= 400 && res.statusCode < 500) return 'warn'
        return 'info'
      },
      serializers: {
        err: (err) => {
          const status =
            err.status || err.response?.statusCode || err.statusCode || 500

          if (status >= 400 && status < 500) {
            if (
              err.name === 'ZodValidationException' ||
              err.response?.message === 'Validation failed'
            ) {
              let validationDetails = err.response?.errors
              if (!validationDetails && err.error?.message) {
                try {
                  validationDetails = JSON.parse(err.error.message)
                } catch {
                  // ignore parse error
                }
              }
              return {
                type: err.name || 'ValidationException',
                message: err.message,
                validationDetails: validationDetails || err.response?.message,
              }
            }

            return {
              type: err.name || 'ClientError',
              message: err.message,
            }
          }

          return stdSerializers.err(err)
        },
      },
      transport: isProd
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: false,
              translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
            },
          },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'body.password',
          'body.token',
          'body.accessToken',
          'body.refreshToken',
        ],
        censor: '[REDACTED]',
      },
    },
  }
}
