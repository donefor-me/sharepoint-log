import { SetMetadata } from '@nestjs/common'

export const RESPONSE_MESSAGE_KEY = 'response_message'

/**
 * Decorator to attach a custom response message to a route handler.
 * This message is later used by the TransformInterceptor to format the response.
 *
 * @param {string} message - The custom success message to return.
 * @returns {CustomDecorator} A NestJS custom decorator.
 */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message)
