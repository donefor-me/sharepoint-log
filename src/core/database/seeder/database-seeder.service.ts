import { EnvironmentVariables } from '@core/config/env.validation'
import { Logger } from '@core/logger/logger.service'
import { Injectable } from '@nestjs/common'
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
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  async seed() {
    const adminExists = await this.userRepository.findOne({
      where: { username: 'admin' },
    })
    if (!adminExists) {
      this.logger.log('Admin user not found. Seeding initial admin user...')

      const adminPassword =
        this.configService.get('ADMIN_DEFAULT_PASSWORD', { infer: true }) ||
        'admin'
      const hashedPassword = await bcrypt.hash(adminPassword, 10)

      const admin = this.userRepository.create({
        username: 'admin',
        password: hashedPassword,
      })

      await this.userRepository.save(admin)
      this.logger.log('Admin user successfully seeded.')
    } else {
      this.logger.log('Admin user already exists.')
    }
  }
}
