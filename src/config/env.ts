import dotenv from "dotenv";

dotenv.config();

type NodeEnv = "development" | "test" | "production";

type Config = {
  nodeEnv: NodeEnv;
  port: number;
  publicBaseUrl: string;
  mongodbUri: string;
  redisUrl: string;
  jwtAccessSecret: string;
  jwtAccessExpiresIn: string;
  googleClientId: string;
  urlCodeLength: number;
  urlCacheTtlSeconds: number;
};

const toNumber = (key: string, fallback: number): number => {
  const rawValue = process.env[key];
  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${key} must be a number.`);
  }

  return value;
};

const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Environment variable ${key} is required.`);
  }

  return value;
};

const nodeEnv = (process.env.NODE_ENV ?? "development") as NodeEnv;

export const config: Config = {
  nodeEnv,
  port: toNumber("PORT", 4000),
  publicBaseUrl: required("PUBLIC_BASE_URL", "http://localhost:4000").replace(/\/+$/, ""),
  mongodbUri: required("MONGODB_URI", "mongodb://127.0.0.1:27017/url_shortner"),
  redisUrl: required("REDIS_URL", "redis://127.0.0.1:6379"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET", nodeEnv === "production" ? undefined : "dev-only-change-me"),
  jwtAccessExpiresIn: required("JWT_ACCESS_EXPIRES_IN", "7d"),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  urlCodeLength: toNumber("URL_CODE_LENGTH", 7),
  urlCacheTtlSeconds: toNumber("URL_CACHE_TTL_SECONDS", 86_400)
};
