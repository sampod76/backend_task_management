import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import type { Response } from 'express';
import type { AuthenticatedRequest } from 'src/modules/auth/auth.types';

/**
 * Request logging interceptor for selected controllers.
 *
 * Flow:
 * requestIdMiddleware
 * -> LoggingInterceptor
 * -> controller handler
 * -> completion log + x-response-time header
 *
 * Runtime notes:
 * - Logs request metadata, not response bodies.
 * - request.requestStart is attached for other middleware/interceptors that may
 *   need the same timing origin.
 *
 * @see src/common/middlewares/request-id.middleware.ts
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  // Interceptor এর main method → প্রতিটি request এ চালায়
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    // ==========================================
    // ⭐ 1) BEFORE CONTROLLER — Request পাওয়ার সাথে সাথে
    // ==========================================

    // HTTP Request object access
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Timer start: controller execute হতে কত সময় লাগে
    const startTime = Date.now();

    // চাইলে request object এ custom data attach করা যায়
    request.requestStart = startTime;

    this.logger.log(
      JSON.stringify({
        message: 'Request received',
        requestId: request.requestId,
        method: request.method,
        url: request.url,
      }),
    );

    // ==========================================
    // ⭐ 2) AFTER CONTROLLER — Controller response পাওয়ার পরে
    // ==========================================

    /*
    next.handle() কল হওয়ার সাথে সাথেই আসল Controller method execute হয়।
    Controller-এর সব কাজ—ডেটাবেস query, service logic, external API call—এই সময়েই সম্পন্ন হয়।
    Controller যে raw data return করে, Interceptor সেটিকে Observable হিসেবে গ্রহণ করে এবং .pipe(...) এর ভিতরে পাঠায়।
    .pipe() এই Observable ডেটাকে step-by-step প্রসেস করার জন্য একটি processing pipeline তৈরি করে।
    .pipe() মূলত একটি chaining system যেখানে একটার পর একটা operator (যেমন: map, tap, catchError) সিরিয়ালি execute হয়।
    ----->.map() হলো একটি transformation operator — এটি incoming data modify করে নতুন data return করে।
    ----->.tap() data পরিবর্তন করে না — এটি কেবল data “দেখে”, লগ করে, অথবা কোনো side effect করে।
        (Side effect: log করা, performance track করা, debug করা ইত্যাদি)

    */

    return next.handle().pipe(
      map((data) => {
        // Controller method execution শেষ হয়েছে
        // const endTime = Date.now();
        // const duration = endTime - startTime;
        // আমরা যেভাবে চাই response transform করে পাঠাতে পারি
        // return {
        //   success: true,
        //   duration: `${duration}ms`,
        //   data: data, // Controller থেকে আসা raw data
        // };

        return data;
      }),
      tap(() => {
        // Controller method execution শেষ হয়েছে
        const endTime = Date.now();
        const duration = endTime - startTime;

        // ✅ HTTP Response object access
        const response = context.switchToHttp().getResponse<Response>();
        this.logger.log(
          JSON.stringify({
            message: 'Request completed',
            requestId: request.requestId,
            method: request.method,
            url: request.url,
            statusCode: response.statusCode,
            durationMs: duration,
          }),
        );

        // ✅ Add response time as HEADER (safe for production)
        response.setHeader('x-response-time', `${duration}ms`);
      }),
    );
  }
}
