import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OAuth2Client } from "google-auth-library";
import { config } from "../../config/env";
import { UserDocument } from "../users/schemas/user.schema";
import { UsersService } from "../users/users.service";
import { GoogleLoginDto } from "./dto/google-login.dto";

type AuthResponse = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  accessToken: string;
};

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async loginWithGoogle(input: GoogleLoginDto): Promise<AuthResponse> {
    if (!config.googleClientId) {
      throw new ServiceUnavailableException("Google login is not configured");
    }

    const ticket = await this.googleClient
      .verifyIdToken({
        idToken: input.credential,
        audience: config.googleClientId
      })
      .catch(() => {
        throw new UnauthorizedException("Invalid Google login token");
      });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException("Google account email is not verified");
    }

    const googleProfile = {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name ?? payload.email,
      avatarUrl: payload.picture
    };

    const existingGoogleUser = await this.usersService.findByGoogleId(googleProfile.googleId);
    if (existingGoogleUser) {
      const user = await this.usersService.updateGoogleProfile(existingGoogleUser, googleProfile);
      return this.toAuthResponse(user);
    }

    const existingEmailUser = await this.usersService.findByEmail(googleProfile.email);
    if (existingEmailUser) {
      const user = await this.usersService.updateGoogleProfile(existingEmailUser, googleProfile);
      return this.toAuthResponse(user);
    }

    const user = await this.usersService.createUser({
      name: googleProfile.name,
      email: googleProfile.email,
      googleId: googleProfile.googleId,
      avatarUrl: googleProfile.avatarUrl
    });

    return this.toAuthResponse(user);
  }

  private toAuthResponse(user: UserDocument): AuthResponse {
    const id = user._id.toString();
    const payload = {
      sub: id,
      email: user.email
    };

    return {
      user: {
        id,
        name: user.name,
        email: user.email
      },
      accessToken: this.jwtService.sign(payload)
    };
  }
}
