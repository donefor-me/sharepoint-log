import { HttpException, HttpStatus } from '@nestjs/common'
import { ZodValidationException } from 'nestjs-zod'
import { ZodError } from 'zod'

import { DomainException } from '../exceptions/domain.exception'
import { InfrastructureException } from '../exceptions/infrastructure.exception'

interface ErrorPayload {
  status: HttpStatus
  message: string | string[]
  error?: unknown
}

function fromZodValidation(exception: ZodValidationException): ErrorPayload {
  const zodError = exception.getZodError() as ZodError
  return {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    message: 'Validation failed',
    error: zodError.issues.map((issue) => ({
      field: issue.path.map(String).join('.'),
      message: issue.message,
      code: issue.code,
    })),
  }
}

function fromHttpException(exception: HttpException): ErrorPayload {
  const status = exception.getStatus()
  const body = exception.getResponse()

  if (typeof body === 'string') {
    return { status, message: body }
  }

  const { message, error } = body as {
    message?: string | string[]
    error?: unknown
  }
  return { status, message: message ?? 'Error', error }
}

function fromInfrastructureException(
  exception: InfrastructureException,
): ErrorPayload {
  return {
    status: exception.statusCode,
    message: exception.message,
    error: exception.name,
  }
}

function fromDomainException(exception: DomainException): ErrorPayload {
  return {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    message: exception.message,
    error: exception.name,
  }
}

export function resolveErrorPayload(exception: unknown): ErrorPayload {
  if (exception instanceof ZodValidationException) {
    return fromZodValidation(exception)
  }
  if (exception instanceof HttpException) {
    return fromHttpException(exception)
  }
  if (exception instanceof InfrastructureException) {
    return fromInfrastructureException(exception)
  }
  if (exception instanceof DomainException) {
    return fromDomainException(exception)
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal Server Error',
  }
}
