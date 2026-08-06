import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

import sharepointConfig from '../../config/sharepoint.config'
import { EncryptionModule } from '../encryption/encryption.module'
import { SharepointTokenCache } from './entities/sharepoint-token-cache.entity'
import { SharepointTokenCacheRepository } from './repositories/sharepoint-token-cache.repository'
import { SharepointController } from './sharepoint.controller'
import { SharepointService } from './sharepoint.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([SharepointTokenCache]),
    ConfigModule.forFeature(sharepointConfig),
    EncryptionModule,
  ],
  controllers: [SharepointController],
  providers: [SharepointService, SharepointTokenCacheRepository],
  exports: [SharepointService],
})
export class SharepointModule {}
