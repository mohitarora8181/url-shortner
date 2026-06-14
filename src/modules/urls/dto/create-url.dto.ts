import { Transform } from "class-transformer";
import { IsOptional, IsString, IsUrl, Length, Matches, MaxLength } from "class-validator";
import { normalizeAlias } from "../url.utils";

export class CreateUrlDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  originalUrl: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? normalizeAlias(value) : value))
  @IsString()
  @Length(3, 64)
  @Matches(/^[a-z0-9_-]+$/, {
    message: "Custom alias may contain only letters, numbers, hyphens, and underscores"
  })
  customAlias?: string;
}
