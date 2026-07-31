import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { AxiosRequestConfig } from 'axios'

@Injectable()
export class HttpClientService {
  constructor(private readonly httpService: HttpService) {}

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('GET', url, undefined, config)
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>('POST', url, data, config)
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>('PUT', url, data, config)
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('DELETE', url, undefined, config)
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await firstValueFrom(
      this.httpService.request<T>({ method, url, data, ...config }),
    )
    return response.data
  }
}
