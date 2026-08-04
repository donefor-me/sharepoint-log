import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'
import { AuditLog } from '../modules/audit-log-sync/entities/audit-log.entity'
import { AuditLogSyncState } from '../modules/audit-log-sync/entities/audit-log-sync-state.entity'
import { SharepointTokenCache } from '../modules/sharepoint/entities/sharepoint-token-cache.entity'

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
        entities: [AuditLog, SharepointTokenCache, AuditLogSyncState],
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
