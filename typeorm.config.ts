import { config } from 'dotenv'
import { DataSource } from 'typeorm'

import { AuditLog } from './src/modules/audit-log-sync/entities/audit-log.entity'
import { AuditLogDlq } from './src/modules/audit-log-sync/entities/audit-log-dlq.entity'
import { AuditLogSyncState } from './src/modules/audit-log-sync/entities/audit-log-sync-state.entity'
import { SharepointTokenCache } from './src/modules/sharepoint/entities/sharepoint-token-cache.entity'
import { User } from './src/modules/users/entities/user.entity'

config()

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'sharepoint_logs',
  entities: [
    AuditLog,
    SharepointTokenCache,
    AuditLogSyncState,
    User,
    AuditLogDlq,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
})
