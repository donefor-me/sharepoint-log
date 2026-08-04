import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'
import { AuditLog, AuditLogSyncState } from '../modules/audit-log-sync'
import { SharepointTokenCache } from '../modules/sharepoint'
import { User } from '../modules/users'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: configService.get<number>('DB_PORT') || 5432,
        username: configService.get<string>('DB_USER') || 'postgres',
        password: configService.get<string>('DB_PASS') || 'postgres',
        database: configService.get<string>('DB_NAME') || 'sharepoint_logs',
        entities: [AuditLog, SharepointTokenCache, AuditLogSyncState, User],
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
