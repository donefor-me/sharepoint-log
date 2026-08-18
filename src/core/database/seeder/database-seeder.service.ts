import { EnvironmentVariables } from '@core/config/env.validation'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { Repository } from 'typeorm'

import { User } from '../../../modules/users/entities/user.entity'

@Injectable()
export class DatabaseSeederService {
  private readonly logger = new Logger(DatabaseSeederService.name)

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async seed() {
    const adminExists = await this.userRepository.findOne({
      where: { username: 'admin' },
    })
    if (!adminExists) {
      this.logger.log('[Seeder:Admin] Admin user not found, starting seed...')

      const adminPassword =
        this.configService.get('ADMIN_DEFAULT_PASSWORD', { infer: true }) ||
        'admin'
      const hashedPassword = await bcrypt.hash(adminPassword, 10)

      const admin = this.userRepository.create({
        username: 'admin',
        password: hashedPassword,
      })

      await this.userRepository.save(admin)
      this.logger.log('[Seeder:Admin] Admin user seeded successfully')
    } else {
      this.logger.log('[Seeder:Admin] Admin user already exists, skipping...')
    }
  }
}
