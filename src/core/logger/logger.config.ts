import { randomUUID } from 'crypto'
import { Params } from 'nestjs-pino'

export const loggerConfig: Params = {
  pinoHttp: {
    genReqId: (req) =>
      (req.headers['x-correlation-id'] as string) || randomUUID(),
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              colorize: true,
            },
          }
        : undefined,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'body.password',
        'body.token',
      ],
      censor: '[REDACTED]',
    },
    autoLogging: true,
  },
}
