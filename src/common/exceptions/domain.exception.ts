import { AppException } from './app.exception'

export class DomainException extends AppException {
  readonly logLevel = 'warn' as const
}
