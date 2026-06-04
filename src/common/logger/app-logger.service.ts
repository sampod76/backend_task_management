import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppLoggerService extends Logger {
  logWithContext(message: string, contextData?: Record<string, unknown>) {
    this.log(`${message} ${contextData ? JSON.stringify(contextData) : ''}`);
  }

  errorWithContext(
    message: string,
    error?: unknown,
    contextData?: Record<string, unknown>,
  ) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.error(
      `${message} | ${errorMessage} ${contextData ? JSON.stringify(contextData) : ''}`,
    );
  }
}
