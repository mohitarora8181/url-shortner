import { Controller, Get, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { UrlsService } from "../urls/url.service";

@Controller()
export class RedirectController {
  constructor(private readonly urlsService: UrlsService) {}

  @Get(":shortCode")
  async redirectToOriginalUrl(@Param("shortCode") shortCode: string, @Res() response: Response): Promise<void> {
    const originalUrl = await this.urlsService.resolveShortCode(shortCode);
    response.redirect(302, originalUrl);
  }
}
