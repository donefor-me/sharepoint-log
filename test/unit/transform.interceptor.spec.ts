/* eslint-disable @typescript-eslint/unbound-method */
import { CallHandler, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { of } from 'rxjs'

import { RESPONSE_MESSAGE_KEY } from '../../src/common/decorators/response-message.decorator'
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor'

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>
  let reflector: jest.Mocked<Reflector>
  let executionContext: jest.Mocked<ExecutionContext>
  let callHandler: jest.Mocked<CallHandler>

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
      getAllAndOverride: jest.fn(),
    }

    interceptor = new TransformInterceptor(reflector)

    executionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToHttp: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    }

    callHandler = {
      handle: jest.fn(),
    }
  })

  it('should wrap data into standard API response format { message, data }', (done) => {
    reflector.get.mockReturnValue('Custom Message')
    const responseData = { id: 1, name: 'Test' }
    callHandler.handle.mockReturnValue(of(responseData))

    interceptor.intercept(executionContext, callHandler).subscribe((result) => {
      expect(result).toEqual({
        message: 'Custom Message',
        data: responseData,
      })
      expect(reflector.get).toHaveBeenCalledWith(
        RESPONSE_MESSAGE_KEY,
        executionContext.getHandler(),
      )
      done()
    })
  })

  it('should wrap object with data and meta properties correctly', (done) => {
    reflector.get.mockReturnValue(undefined) // Default to "Success"
    const responseData = {
      data: [{ id: 1 }],
      meta: { total: 1, page: 1 },
    }
    callHandler.handle.mockReturnValue(of(responseData))

    interceptor.intercept(executionContext, callHandler).subscribe((result) => {
      expect(result).toEqual({
        message: 'Success',
        data: [{ id: 1 }],
        meta: { total: 1, page: 1 },
      })
      done()
    })
  })
})
