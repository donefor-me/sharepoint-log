import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { SharepointService } from './sharepoint.service'
import { SharepointController } from './sharepoint.controller'
import { SharepointLog } from './entities/sharepoint-log.entity'
import { SharepointTokenCache } from './entities/sharepoint-token-cache.entity'
import sharepointConfig from './infrastructure/sharepoint.config'
import { SharepointClient } from './infrastructure/sharepoint.client'
import { SharepointTokenCacheRepository } from './repositories/sharepoint-token-cache.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([SharepointLog, SharepointTokenCache]),
    ConfigModule.forFeature(sharepointConfig),
  ],
  controllers: [SharepointController],
  providers: [
    SharepointService,
    SharepointClient,
    SharepointTokenCacheRepository,
  ],
  exports: [SharepointService],
})
export class SharepointModule {}
