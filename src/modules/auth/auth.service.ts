import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'

import { UserResponseDto } from '../users/dto/user-response.dto'
import { UsersService } from '../users/users.service'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(loginDto: LoginDto): Promise<UserResponseDto | null> {
    const { username, password } = loginDto
    const user = await this.usersService.findForAuth(username)
    if (user && user.password) {
      const isMatch = await bcrypt.compare(password, user.password)
      if (isMatch) {
        return {
          id: user.id,
          username: user.username,
          createdAt: user.createdAt,
        }
      }
    }
    return null
  }

  login(user: any) {
    const payload = { username: user.username, sub: user.id }
    return {
      access_token: this.jwtService.sign(payload),
    }
  }
}
