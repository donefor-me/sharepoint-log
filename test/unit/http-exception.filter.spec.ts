import { ArgumentsHost, BadRequestException } from '@nestjs/common'
import { Response } from 'express'

import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter'

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter
  let mockArgumentsHost: jest.Mocked<ArgumentsHost>
  let mockResponse: Partial<Response>

  beforeEach(() => {
    filter = new HttpExceptionFilter()

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse as Response,
        getRequest: jest.fn(),
        getNext: jest.fn(),
      }),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    }
  })

  it('should format output correctly when a BadRequestException is thrown', () => {
    const exception = new BadRequestException('Bad Request Message')

    filter.catch(exception, mockArgumentsHost)

    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Bad Request Message',
        error: 'Bad Request',
        timestamp: expect.any(String),
      }),
    )
  })
})
