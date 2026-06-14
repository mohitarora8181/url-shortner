import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RedisModule } from "../../redis/redis.module";
import { AuthModule } from "../auth/auth.module";
import { ShortUrl, ShortUrlSchema } from "./schemas/short-url.schema";
import { UrlController } from "./url.controller";
import { UrlsService } from "./url.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: ShortUrl.name, schema: ShortUrlSchema }]), RedisModule, AuthModule],
  controllers: [UrlController],
  providers: [UrlsService],
  exports: [UrlsService]
})
export class UrlsModule {}
