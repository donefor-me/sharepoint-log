import { EncryptionModule } from '@modules/encryption/encryption.module'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { SharepointTokenCache } from './entities/sharepoint-token-cache.entity'
import { SharepointTokenCacheRepository } from './repositories/sharepoint-token-cache.repository'
import { SharepointIntegrationController } from './sharepoint-integration.controller'
import { SharepointIntegrationService } from './sharepoint-integration.service'

@Module({
  imports: [TypeOrmModule.forFeature([SharepointTokenCache]), EncryptionModule],
  controllers: [SharepointIntegrationController],
  providers: [SharepointIntegrationService, SharepointTokenCacheRepository],
  exports: [SharepointIntegrationService],
})
export class SharepointIntegrationModule {}
