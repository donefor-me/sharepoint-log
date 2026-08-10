import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

import { SeederModule } from './seeder/seeder.module'

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
        autoLoadEntities: true,
        namingStrategy: new SnakeNamingStrategy(),
        synchronize: false,
      }),
    }),
    SeederModule,
  ],
})
export class DatabaseModule {}
