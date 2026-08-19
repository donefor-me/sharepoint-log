export abstract class AppException extends Error {
  abstract readonly logLevel:
    'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}
