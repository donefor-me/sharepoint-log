import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { SharepointService } from './sharepoint.service'
import { SharepointController } from './sharepoint.controller'
import { SharepointTokenCache } from './entities/sharepoint-token-cache.entity'
import sharepointConfig from '../../config/sharepoint.config'
import { SharepointTokenCacheRepository } from './repositories/sharepoint-token-cache.repository'
import { EncryptionModule } from '../encryption/encryption.module'

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
