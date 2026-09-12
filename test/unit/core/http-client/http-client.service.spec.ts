import { HttpService } from '@nestjs/axios'
import { Test, TestingModule } from '@nestjs/testing'
import { AxiosRequestConfig, AxiosResponse } from 'axios'
import { of } from 'rxjs'

import { HttpClientService } from '../../../../src/core/http-client/http-client.service'

describe('HttpClientService', () => {
  let service: HttpClientService
  let httpService: jest.Mocked<HttpService>

  beforeEach(async () => {
    const mockHttpService = {
      request: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpClientService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile()

    service = module.get<HttpClientService>(HttpClientService)
    httpService = module.get(HttpService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('get', () => {
    it('should send a GET request and return data', async () => {
      const responseData = { success: true }
      const axiosResponse = {
        data: responseData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as AxiosRequestConfig,
      } as AxiosResponse

      httpService.request.mockReturnValue(of(axiosResponse))

      const result = await service.get<{ success: boolean }>(
        'https://api.com',
        { headers: { Auth: 'Token' } },
      )
      expect(jest.spyOn(httpService, 'request')).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://api.com',
        data: undefined,
        headers: { Auth: 'Token' },
      })
      expect(result).toEqual(responseData)
    })
  })

  describe('getRaw', () => {
    it('should send a GET request and return raw response', async () => {
      const responseData = { success: true }
      const axiosResponse = {
        data: responseData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as AxiosRequestConfig,
      } as AxiosResponse

      httpService.request.mockReturnValue(of(axiosResponse))

      const result = await service.getRaw<{ success: boolean }>(
        'https://api.com',
      )
      expect(jest.spyOn(httpService, 'request')).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://api.com',
      })
      expect(result).toEqual(axiosResponse)
    })
  })

  describe('post', () => {
    it('should send a POST request and return data', async () => {
      const responseData = { id: 1 }
      const axiosResponse = {
        data: responseData,
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as AxiosRequestConfig,
      } as AxiosResponse

      httpService.request.mockReturnValue(of(axiosResponse))

      const payload = { name: 'test' }
      const result = await service.post<{ id: number }>(
        'https://api.com',
        payload,
      )
      expect(jest.spyOn(httpService, 'request')).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://api.com',
        data: payload,
      })
      expect(result).toEqual(responseData)
    })
  })
})
