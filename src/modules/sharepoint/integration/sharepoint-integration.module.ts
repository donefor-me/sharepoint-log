import { EncryptionModule } from '@modules/encryption/encryption.module'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { SharepointTokenCache } from './entities/sharepoint-token-cache.entity'
import { SharepointTokenCacheRepository } from './repositories/sharepoint-token-cache.repository'
import { SharepointController } from './sharepoint.controller'
import { SharepointService } from './sharepoint.service'

@Module({
  imports: [TypeOrmModule.forFeature([SharepointTokenCache]), EncryptionModule],
  controllers: [SharepointController],
  providers: [SharepointService, SharepointTokenCacheRepository],
  exports: [SharepointService],
})
export class SharepointIntegrationModule {}
