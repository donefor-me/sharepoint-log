import { AuditLog } from '@modules/sharepoint-audit-log-sync/entities/audit-log.entity'
import { AuditLogDlq } from '@modules/sharepoint-audit-log-sync/entities/audit-log-dlq.entity'
import { SharepointTokenCache } from '@modules/sharepoint-integration/entities/sharepoint-token-cache.entity'
import { InfraDistributedLock } from '@platform/infra-distributed-lock/entities/infra-distributed-lock.entity'
import { InfraWatermark } from '@platform/infra-watermark/entities/infra-watermark.entity'
import { config } from 'dotenv'
import { DataSource } from 'typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

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
    InfraDistributedLock,
    InfraWatermark,
    AuditLogDlq,
  ],
  migrations: ['src/core/database/migrations/*.{ts,js}'],
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false,
})
