import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthenticatedRequest } from "../../common/types/current-user.type";
import { UsersService } from "../users/users.service";

type AccessTokenPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException("Authentication token is required");
    }

    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token);
      const user = await this.usersService.findAuthContextById(payload.sub);

      if (!user) {
        throw new UnauthorizedException("User no longer exists");
      }

      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Invalid or expired authentication token");
    }
  }

  private extractToken(authorization: string | string[] | undefined): string | undefined {
    if (Array.isArray(authorization)) {
      return undefined;
    }

    return authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined;
  }
}
