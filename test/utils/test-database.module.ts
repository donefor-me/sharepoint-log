import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('TEST_DB_HOST') || 'localhost',
        port: configService.get<number>('TEST_DB_PORT') || 5432,
        username: configService.get<string>('TEST_DB_USER') || 'postgres',
        password: configService.get<string>('TEST_DB_PASS') || 'postgres',
        database:
          configService.get<string>('TEST_DB_NAME') || 'sharepoint_test',
        autoLoadEntities: true,
        namingStrategy: new SnakeNamingStrategy(),
        synchronize: true,
        keepConnectionAlive: true,
      }),
    }),
  ],
})
export class TestDatabaseModule {}
