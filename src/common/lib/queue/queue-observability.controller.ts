import { Controller, Get } from '@nestjs/common';
import { QueueObservabilityService } from './queue-observability.service';

@Controller()
export class QueueObservabilityController {
  constructor(private readonly observability: QueueObservabilityService) {}

  @Get('health')
  health() {
    return this.observability.health();
  }

  @Get('queues/metrics')
  metrics() {
    return this.observability.metrics();
  }
}
