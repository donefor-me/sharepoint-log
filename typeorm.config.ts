import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { AuditLog } from './src/modules/audit-log-sync/entities/audit-log.entity';
import { AuditLogSyncState } from './src/modules/audit-log-sync/entities/audit-log-sync-state.entity';
import { SharepointTokenCache } from './src/modules/sharepoint/entities/sharepoint-token-cache.entity';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'sharepoint_logs',
  entities: [AuditLog, SharepointTokenCache, AuditLogSyncState],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
