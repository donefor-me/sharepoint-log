import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'
import { DatabaseSeederService } from './core/database/seeder/database-seeder.service'
import { SeederModule } from './core/database/seeder/seeder.module'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule)
  const seeder = app.select(SeederModule).get(DatabaseSeederService)

  try {
    await seeder.seed()
    console.log('Seeding completed successfully.')
  } catch (error) {
    console.error('Seeding failed!', error)
  } finally {
    await app.close()
    process.exit(0)
  }
}

bootstrap().catch(console.error)
