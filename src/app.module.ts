import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { config } from "./config/env";
import { RedisModule } from "./redis/redis.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { RedirectModule } from "./modules/redirect/redirect.module";
import { UrlsModule } from "./modules/urls/urls.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || config.mongodbUri, {
      bufferCommands: false,
      autoIndex: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      family: 4,
    }),
    RedisModule,
    UsersModule,
    AuthModule,
    UrlsModule,
    HealthModule,
    RedirectModule
  ]
})
export class AppModule {}
