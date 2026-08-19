import { config } from 'dotenv'
import { DataSource } from 'typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

import { AuditLog } from './src/modules/sharepoint/audit-log-sync/entities/audit-log.entity'
import { AuditLogDlq } from './src/modules/sharepoint/audit-log-sync/entities/audit-log-dlq.entity'
import { AuditLogSyncState } from './src/modules/sharepoint/audit-log-sync/entities/audit-log-sync-state.entity'
import { SharepointTokenCache } from './src/modules/sharepoint/integration/entities/sharepoint-token-cache.entity'

config()

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'sharepoint_logs',
  entities: [AuditLog, SharepointTokenCache, AuditLogSyncState, AuditLogDlq],
  migrations: ['src/core/database/migrations/*.ts'],
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false,
})
