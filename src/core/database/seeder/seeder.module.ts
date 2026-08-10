import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

import { User } from '../../../modules/users/entities/user.entity'
import { DatabaseSeederService } from './database-seeder.service'

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User])],
  providers: [DatabaseSeederService],
  exports: [DatabaseSeederService],
})
export class SeederModule {}
