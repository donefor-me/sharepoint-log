import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { InfraWatermark } from './entities/infra-watermark.entity'
import { InfraWatermarkService } from './infra-watermark.service'

@Module({
  imports: [TypeOrmModule.forFeature([InfraWatermark])],
  providers: [InfraWatermarkService],
  exports: [InfraWatermarkService],
})
export class InfraWatermarkModule {}
