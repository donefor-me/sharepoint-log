import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { InfraDistributedLock } from './entities/infra-distributed-lock.entity'
import { InfraDistributedLockService } from './infra-distributed-lock.service'

@Module({
  imports: [TypeOrmModule.forFeature([InfraDistributedLock])],
  providers: [InfraDistributedLockService],
  exports: [InfraDistributedLockService],
})
export class InfraDistributedLockModule {}
