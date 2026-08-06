import { HttpModule } from '@nestjs/axios'
import { Global, Module } from '@nestjs/common'

import { HttpClientService } from './http-client.service'

@Global()
@Module({
  imports: [HttpModule],
  providers: [HttpClientService],
  exports: [HttpClientService],
})
export class HttpClientModule {}
