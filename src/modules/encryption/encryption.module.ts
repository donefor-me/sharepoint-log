import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EncryptionService } from './encryption.service'
import { Logger } from 'src/common/logger/logger.service'

@Module({
  imports: [ConfigModule],
  providers: [EncryptionService, Logger],
  exports: [EncryptionService],
})
export class EncryptionModule {}
