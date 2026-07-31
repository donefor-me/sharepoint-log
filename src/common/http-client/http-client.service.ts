import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { AxiosRequestConfig } from 'axios'

@Injectable()
export class HttpClientService {
  constructor(private readonly httpService: HttpService) {}

  /**
   * Sends an HTTP GET request.
   *
   * @param {string} url - The URL to send the request to.
   * @param {AxiosRequestConfig} [config] - Optional Axios request configuration.
   * @returns {Promise<T>} A promise that resolves to the response data.
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('GET', url, undefined, config)
  }

  /**
   * Sends an HTTP POST request.
   *
   * @param {string} url - The URL to send the request to.
   * @param {any} [data] - The data to be sent as the request body.
   * @param {AxiosRequestConfig} [config] - Optional Axios request configuration.
   * @returns {Promise<T>} A promise that resolves to the response data.
   */
  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>('POST', url, data, config)
  }

  /**
   * Sends an HTTP PUT request.
   *
   * @param {string} url - The URL to send the request to.
   * @param {any} [data] - The data to be sent as the request body.
   * @param {AxiosRequestConfig} [config] - Optional Axios request configuration.
   * @returns {Promise<T>} A promise that resolves to the response data.
   */
  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>('PUT', url, data, config)
  }

  /**
   * Sends an HTTP DELETE request.
   *
   * @param {string} url - The URL to send the request to.
   * @param {AxiosRequestConfig} [config] - Optional Axios request configuration.
   * @returns {Promise<T>} A promise that resolves to the response data.
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('DELETE', url, undefined, config)
  }

  /**
   * A generic method to send HTTP requests using the configured HttpService.
   *
   * @param {string} method - The HTTP method (e.g., 'GET', 'POST').
   * @param {string} url - The URL to send the request to.
   * @param {any} [data] - The request payload.
   * @param {AxiosRequestConfig} [config] - Additional Axios request configuration.
   * @returns {Promise<T>} A promise that resolves to the response data.
   */
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
