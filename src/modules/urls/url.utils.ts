import { randomInt } from "crypto";
import { config } from "../../config/env";
import { RESERVED_SHORT_CODES, SHORT_CODE_ALPHABET } from "./url.constants";

export const normalizeAlias = (alias: string): string =>
  alias
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/[-_]{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

export const isReservedShortCode = (code: string): boolean => RESERVED_SHORT_CODES.has(code.toLowerCase());

export const createRandomShortCode = (length = config.urlCodeLength): string => {
  let code = "";

  for (let index = 0; index < length; index += 1) {
    code += SHORT_CODE_ALPHABET[randomInt(SHORT_CODE_ALPHABET.length)];
  }

  return code;
};

export const buildShortUrl = (shortCode: string): string => `${config.publicBaseUrl}/${shortCode}`;

export const cacheKeyForShortCode = (shortCode: string): string => `short-url:${shortCode}`;
