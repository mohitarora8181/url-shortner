import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUserDecorator } from "../../common/decorators/current-user.decorator";
import { ParseObjectIdPipe } from "../../common/pipes/parse-object-id.pipe";
import type { CurrentUser } from "../../common/types/current-user.type";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateUrlDto } from "./dto/create-url.dto";
import { CustomAliasSearchQueryDto } from "./dto/custom-alias-search-query.dto";
import { ListUrlsQueryDto } from "./dto/list-urls-query.dto";
import { UpdateUrlDto } from "./dto/update-url.dto";
import { UrlsService } from "./url.service";

@Controller("api/urls")
@UseGuards(JwtAuthGuard)
export class UrlController {
  constructor(private readonly urlsService: UrlsService) {}

  @Post()
  async createUrl(@CurrentUserDecorator() user: CurrentUser, @Body() input: CreateUrlDto) {
    const result = await this.urlsService.createUrl(user.id, input);

    return {
      success: true,
      data: result
    };
  }

  @Get()
  async listUrls(@CurrentUserDecorator() user: CurrentUser, @Query() query: ListUrlsQueryDto) {
    const result = await this.urlsService.listUrls(user.id, query);

    return {
      success: true,
      data: result
    };
  }

  @Get("custom-names/search")
  async searchCustomAliases(@CurrentUserDecorator() user: CurrentUser, @Query() query: CustomAliasSearchQueryDto) {
    const result = await this.urlsService.searchCustomAliases(user.id, query);

    return {
      success: true,
      data: result
    };
  }

  @Get(":id")
  async getUrlById(@CurrentUserDecorator() user: CurrentUser, @Param("id", ParseObjectIdPipe) id: string) {
    const result = await this.urlsService.getUrlById(user.id, id);

    return {
      success: true,
      data: result
    };
  }

  @Patch(":id")
  async updateUrl(
    @CurrentUserDecorator() user: CurrentUser,
    @Param("id", ParseObjectIdPipe) id: string,
    @Body() input: UpdateUrlDto
  ) {
    const result = await this.urlsService.updateUrl(user.id, id, input);

    return {
      success: true,
      data: result
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateUrl(@CurrentUserDecorator() user: CurrentUser, @Param("id", ParseObjectIdPipe) id: string) {
    await this.urlsService.deactivateUrl(user.id, id);
  }
}
