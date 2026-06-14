import { Module } from "@nestjs/common";
import { UrlsModule } from "../urls/urls.module";
import { RedirectController } from "./redirect.controller";

@Module({
  imports: [UrlsModule],
  controllers: [RedirectController]
})
export class RedirectModule {}
