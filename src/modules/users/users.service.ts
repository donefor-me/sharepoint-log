import { Logger } from '@common'
import { Injectable, OnApplicationBootstrap } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { Repository } from 'typeorm'

import { User } from './entities/user.entity'

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name)

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    const adminExists = await this.userRepository.findOne({
      where: { username: 'admin' },
    })
    if (!adminExists) {
      this.logger.log('Admin user not found. Seeding initial admin user...')
      const hashedPassword = await bcrypt.hash('admin', 10)
      const admin = this.userRepository.create({
        username: 'admin',
        password: hashedPassword,
      })
      await this.userRepository.save(admin)
      this.logger.log(
        'Admin user successfully seeded (username: admin, password: admin).',
      )
    }
  }

  async findOne(username: string): Promise<User | null> {
    // TODO: remove sensitive fields
    return this.userRepository.findOne({ where: { username } })
  }
}
