import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { CurrentUserDecorator } from "../../common/decorators/current-user.decorator";
import type { CurrentUser } from "../../common/types/current-user.type";
import { AuthService } from "./auth.service";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("google")
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() input: GoogleLoginDto) {
    const result = await this.authService.loginWithGoogle(input);

    return {
      success: true,
      data: result
    };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUserDecorator() user: CurrentUser) {
    return {
      success: true,
      data: {
        user
      }
    };
  }
}
