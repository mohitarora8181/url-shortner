import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, Types } from "mongoose";
import { config } from "../../config/env";
import { RedisService } from "../../redis/redis.service";
import {
  buildShortUrl,
  cacheKeyForShortCode,
  createRandomShortCode,
  isReservedShortCode,
  normalizeAlias
} from "./url.utils";
import { CreateUrlDto } from "./dto/create-url.dto";
import { CustomAliasSearchQueryDto } from "./dto/custom-alias-search-query.dto";
import { ListUrlsQueryDto } from "./dto/list-urls-query.dto";
import { UpdateUrlDto } from "./dto/update-url.dto";
import { ShortUrl, ShortUrlDocument } from "./schemas/short-url.schema";

type UrlResponse = {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  customAlias?: string;
  clickCount: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastAccessedAt?: Date;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

@Injectable()
export class UrlsService {
  constructor(
    @InjectModel(ShortUrl.name) private readonly urlModel: Model<ShortUrlDocument>,
    private readonly redisService: RedisService
  ) {}

  async createUrl(ownerId: string, input: CreateUrlDto): Promise<UrlResponse> {
    const customAlias = input.customAlias ? normalizeAlias(input.customAlias) : undefined;
    const shortCode = customAlias ?? (await this.generateAvailableShortCode());

    if (customAlias) {
      await this.ensureShortCodeAvailable(customAlias);
    }

    const url = await this.urlModel.create({
      owner: new Types.ObjectId(ownerId),
      originalUrl: input.originalUrl,
      shortCode,
      customAlias
    });

    await this.cacheUrl(url.shortCode, url.originalUrl);

    return this.toUrlResponse(url);
  }

  async listUrls(
    ownerId: string,
    query: ListUrlsQueryDto
  ): Promise<{ items: UrlResponse[]; page: number; limit: number; total: number }> {
    const filter: FilterQuery<ShortUrlDocument> = {
      owner: new Types.ObjectId(ownerId)
    };

    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [{ originalUrl: regex }, { shortCode: regex }, { customAlias: regex }];
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.urlModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).exec(),
      this.urlModel.countDocuments(filter).exec()
    ]);

    return {
      items: items.map((url) => this.toUrlResponse(url)),
      page: query.page,
      limit: query.limit,
      total
    };
  }

  async searchCustomAliases(
    ownerId: string,
    query: CustomAliasSearchQueryDto
  ): Promise<Array<{ id: string; customAlias: string; shortUrl: string; originalUrl: string }>> {
    const regex = new RegExp(escapeRegex(query.q), "i");
    const urls = await this.urlModel
      .find({
        owner: new Types.ObjectId(ownerId),
        customAlias: regex,
        isActive: true
      })
      .sort({ createdAt: -1 })
      .limit(query.limit)
      .select("_id customAlias shortCode originalUrl")
      .exec();

    return urls
      .filter((url) => Boolean(url.customAlias))
      .map((url) => ({
        id: url._id.toString(),
        customAlias: url.customAlias as string,
        shortUrl: buildShortUrl(url.shortCode),
        originalUrl: url.originalUrl
      }));
  }

  async getUrlById(ownerId: string, id: string): Promise<UrlResponse> {
    const url = await this.urlModel
      .findOne({
        _id: new Types.ObjectId(id),
        owner: new Types.ObjectId(ownerId)
      })
      .exec();

    if (!url) {
      throw new NotFoundException("URL not found");
    }

    return this.toUrlResponse(url);
  }

  async updateUrl(ownerId: string, id: string, input: UpdateUrlDto): Promise<UrlResponse> {
    if (input.originalUrl === undefined && input.customAlias === undefined) {
      throw new BadRequestException("At least one field is required");
    }

    const url = await this.urlModel
      .findOne({
        _id: new Types.ObjectId(id),
        owner: new Types.ObjectId(ownerId)
      })
      .exec();

    if (!url) {
      throw new NotFoundException("URL not found");
    }

    const previousShortCode = url.shortCode;

    if (input.originalUrl !== undefined) {
      url.originalUrl = input.originalUrl;
    }

    if (input.customAlias !== undefined) {
      if (input.customAlias === null) {
        url.customAlias = undefined;
        url.shortCode = await this.generateAvailableShortCode();
      } else {
        const customAlias = normalizeAlias(input.customAlias);

        if (customAlias !== url.shortCode) {
          await this.ensureShortCodeAvailable(customAlias);
        }

        url.customAlias = customAlias;
        url.shortCode = customAlias;
      }
    }

    await url.save();
    await Promise.all([this.clearCachedUrl(previousShortCode), this.cacheUrl(url.shortCode, url.originalUrl)]);

    return this.toUrlResponse(url);
  }

  async deactivateUrl(ownerId: string, id: string): Promise<void> {
    const url = await this.urlModel
      .findOne({
        _id: new Types.ObjectId(id),
        owner: new Types.ObjectId(ownerId)
      })
      .exec();

    if (!url) {
      throw new NotFoundException("URL not found");
    }

    url.isActive = false;
    await url.save();
    await this.clearCachedUrl(url.shortCode);
  }

  async resolveShortCode(shortCode: string): Promise<string> {
    const normalizedShortCode = normalizeAlias(shortCode);
    if (normalizedShortCode.length < 3 || normalizedShortCode.length > 64) {
      throw new BadRequestException("Invalid short code");
    }

    const cacheKey = cacheKeyForShortCode(normalizedShortCode);
    const cachedUrl = await this.redisService.get(cacheKey);
    if (cachedUrl) {
      void this.urlModel
        .updateOne(
          { shortCode: normalizedShortCode, isActive: true },
          { $inc: { clickCount: 1 }, $set: { lastAccessedAt: new Date() } }
        )
        .exec()
        .catch((error) => console.error("Failed to update URL metrics", error));

      return cachedUrl;
    }

    const url = await this.urlModel
      .findOneAndUpdate(
        { shortCode: normalizedShortCode, isActive: true },
        { $inc: { clickCount: 1 }, $set: { lastAccessedAt: new Date() } },
        { new: true }
      )
      .exec();

    if (!url) {
      throw new NotFoundException("Short URL not found");
    }

    await this.cacheUrl(url.shortCode, url.originalUrl);

    return url.originalUrl;
  }

  private toUrlResponse(url: ShortUrlDocument): UrlResponse {
    return {
      id: url._id.toString(),
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      shortUrl: buildShortUrl(url.shortCode),
      ...(url.customAlias ? { customAlias: url.customAlias } : {}),
      clickCount: url.clickCount,
      isActive: url.isActive,
      ...(url.createdAt ? { createdAt: url.createdAt } : {}),
      ...(url.updatedAt ? { updatedAt: url.updatedAt } : {}),
      ...(url.lastAccessedAt ? { lastAccessedAt: url.lastAccessedAt } : {})
    };
  }

  private async ensureShortCodeAvailable(shortCode: string): Promise<void> {
    if (isReservedShortCode(shortCode)) {
      throw new BadRequestException("Short code is reserved");
    }

    const existingUrl = await this.urlModel.exists({ shortCode }).exec();
    if (existingUrl) {
      throw new ConflictException("Custom alias is already taken");
    }
  }

  private async generateAvailableShortCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const shortCode = createRandomShortCode();
      const exists = await this.urlModel.exists({ shortCode }).exec();

      if (!exists && !isReservedShortCode(shortCode)) {
        return shortCode;
      }
    }

    throw new ServiceUnavailableException("Could not generate a unique short URL. Try again.");
  }

  private async cacheUrl(shortCode: string, originalUrl: string): Promise<void> {
    await this.redisService.set(cacheKeyForShortCode(shortCode), originalUrl, config.urlCacheTtlSeconds);
  }

  private async clearCachedUrl(shortCode: string): Promise<void> {
    await this.redisService.del(cacheKeyForShortCode(shortCode));
  }
}
