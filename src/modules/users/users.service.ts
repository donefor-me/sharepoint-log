import { Logger } from '@core/logger/logger.service'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { User } from './entities/user.entity'

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findForAuth(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } })
  }
}
