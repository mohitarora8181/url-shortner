import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import type { AuthenticatedRequest, CurrentUser } from "../types/current-user.type";

export const CurrentUserDecorator = createParamDecorator((_data: unknown, context: ExecutionContext): CurrentUser => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

  if (!request.user) {
    throw new UnauthorizedException("Authentication token is required");
  }

  return request.user;
});
