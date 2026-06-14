import { Transform } from "class-transformer";
import { IsString, IsUrl, Length, Matches, MaxLength, ValidateIf } from "class-validator";
import { normalizeAlias } from "../url.utils";

export class UpdateUrlDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  originalUrl?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @Transform(({ value }) => (typeof value === "string" ? normalizeAlias(value) : value))
  @IsString()
  @Length(3, 64)
  @Matches(/^[a-z0-9_-]+$/, {
    message: "Custom alias may contain only letters, numbers, hyphens, and underscores"
  })
  customAlias?: string | null;
}
