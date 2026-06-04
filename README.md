````md id="jlwm1r"
# ⚙️ Runtime Processes

This service is separated into multiple dedicated runtime processes for better scalability, isolation, and maintenance.

| Process          | Responsibility                                                      |
| ---------------- | ------------------------------------------------------------------- |
| `main.ts`        | REST API server                                                     |
| `worker.ts`      | BullMQ workers and event processing                                 |
| `maintenance.ts` | Cron jobs, partition bootstrap, cleanup jobs, retention maintenance |

---

```ts
pnpm start:dev
pnpm start:worker:dev
pnpm start:maintenance:dev
//
pnpm start:prod
pnpm start:worker:prod
pnpm start:maintenance:prod
```
````

## 🔹 main.ts

Handles:

- HTTP APIs
- Health checks
- Authentication
- Admin endpoints
- Webhooks
- Public/internal API communication

---

## 🔹 worker.ts

Responsible for asynchronous background processing:

- BullMQ queue consumers
- Event processing
- Rule engine execution
- Email dispatching
- Notification dispatching
- Audit log processing
- Retry handling
- Dead-letter queue handling

---

## 🔹 maintenance.ts

Dedicated maintenance runtime responsible for:

- PostgreSQL partition bootstrap
- Automatic partition creation
- Old log cleanup
- Retention maintenance
- Scheduled cron jobs
- Future infrastructure maintenance tasks

This process runs independently to avoid duplicate cron execution across scaled API/worker instances.

```

```
