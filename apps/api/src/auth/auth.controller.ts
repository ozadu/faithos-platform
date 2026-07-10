import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { apiResponse } from '../common/api-response';
import { AuthenticatedUser } from '../common/authenticated-user';
import { CurrentUser } from '../common/current-user.decorator';
import {
  CurrentRequestMetadata,
  RequestMetadata,
} from '../common/request-metadata.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiOkResponse({
    description: 'Access and refresh tokens with the user and organization.',
  })
  @ApiUnauthorizedResponse({ description: 'Credentials are invalid.' })
  async login(
    @Body() credentials: LoginDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Login successful',
      await this.auth.login(credentials, metadata),
    );
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate a refresh token' })
  async refresh(
    @Body() body: RefreshTokenDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Token refreshed',
      await this.auth.refresh(body.refreshToken, metadata),
    );
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke a refresh token session' })
  async logout(
    @Body() body: RefreshTokenDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    await this.auth.logout(body.refreshToken, metadata);
    return apiResponse('Logout successful', null);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Request a password reset email without revealing account status',
  })
  async forgotPassword(
    @Body() body: ForgotPasswordDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'If an active account exists, reset instructions will be sent.',
      await this.auth.forgotPassword(body.email, metadata),
    );
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset a password using a valid reset token' })
  async resetPassword(
    @Body() body: ResetPasswordDto,
    @CurrentRequestMetadata() metadata: RequestMetadata,
  ) {
    return apiResponse(
      'Password reset successful',
      await this.auth.resetPassword(body.token, body.password, metadata),
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user and organization' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse('Current identity retrieved', await this.auth.me(user));
  }
}
