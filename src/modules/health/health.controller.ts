import { Controller, Get } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";

@Controller("health")
export class HealthController {
  constructor(private readonly redisService: RedisService) {}

  @Get()
  getHealth() {
    return {
      success: true,
      data: {
        status: "ok",
        redis: this.redisService.isOpen ? "connected" : "disconnected"
      }
    };
  }
}
