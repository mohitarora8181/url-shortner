import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createClient } from "redis";
import { config } from "../config/env";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client = createClient({
    url: config.redisUrl
  });

  constructor() {
    this.client.on("error", (error) => {
      this.logger.error("Redis error", error);
    });
  }

  get isOpen(): boolean {
    return this.client.isOpen;
  }

  async onModuleInit(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
      this.logger.log("Redis connected");
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client.isOpen) {
      return null;
    }

    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client.isOpen) {
      return;
    }

    await this.client.set(key, value, { EX: ttlSeconds });
  }

  async del(key: string): Promise<void> {
    if (!this.client.isOpen) {
      return;
    }

    await this.client.del(key);
  }
}
