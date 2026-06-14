import { Module } from "@nestjs/common";
import { JwtModule, type JwtSignOptions } from "@nestjs/jwt";
import { config } from "../../config/env";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      secret: config.jwtAccessSecret,
      signOptions: {
        expiresIn: config.jwtAccessExpiresIn as JwtSignOptions["expiresIn"]
      }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule, UsersModule]
})
export class AuthModule {}
