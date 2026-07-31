import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { SharepointLog } from './src/modules/sharepoint/entities/sharepoint-log.entity';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'sharepoint_logs',
  entities: [SharepointLog],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
