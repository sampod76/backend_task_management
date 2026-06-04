# Automation Rule Engine Flow

Automation rules still accept a developer-friendly API shape, but conditions and actions are now persisted relationally. This keeps rule querying, auditing, action ordering, and future reporting safer than storing the whole rule body inside two JSON columns.

## Database Shape

`AutomationRule` stores rule identity and scheduling metadata: `name`, `serviceName`, `eventType`, `isActive`, `priority`, and `description`.

Rule logic lives in child tables:

- `automation.automation_rule_conditions`
- `automation.automation_rule_actions`
- `automation.automation_rule_email_actions`
- `automation.automation_rule_notification_actions`
- `automation.automation_rule_webhook_actions`

The old JSON columns are dropped during the relational migration. Rule logic is stored only in relation tables.

## Why Relational Rows

Relational rows make each condition and action independently queryable and sortable. They also allow action-specific schemas without mixing email, notification, and webhook configuration into one unstructured JSON blob.

## Create Flow

1. Controller validates the request with Zod.
2. Service checks duplicate rules for the same `eventType`, `serviceName`, and condition set.
3. Mapper converts `conditions` into `AutomationRuleCondition` rows.
4. Mapper converts `actions` into `AutomationRuleAction` rows and action-specific config rows.
5. Repository creates the rule with nested Prisma `create`.
6. Service maps relation rows back into the public response shape.

## Update Flow

1. Service loads the existing rule with conditions and actions.
2. If `conditions` or `actions` are omitted, the existing runtime shape is reused.
3. Repository runs a transaction.
4. Existing child rows are hard-deleted, relying on cascade for action config rows.
5. New child rows are created from mapper output.
6. Service returns the same public response shape.

## Execution Flow

1. Rule engine receives an audit/event payload.
2. Repository loads active rules for `eventType` and `serviceName`, ordered by `priority ASC`.
3. Mapper converts relation rows into runtime `conditions` and `actions`.
4. `matchConditions` evaluates all conditions with AND logic.
5. Matching rule actions execute in `sortOrder ASC`.
6. Idempotency is checked per event/rule/action/target.

## Condition Examples

```json
{ "user.role": "admin" }
```

```json
{ "user.phone": { "exists": true } }
```

```json
{
  "payment.amount": { "gt": 5000 },
  "payment.status": { "eq": "PAID" },
  "user.role": { "in": ["admin", "manager"] }
}
```

Supported operators: `gt`, `gte`, `lt`, `lte`, `eq`, `neq`, `in`.

## Student Email Rule

```json
{
  "name": "Student Email",
  "serviceName": "FLYGHOR_AUTH",
  "eventType": "USER_CREATED",
  "conditions": {
    "user.role": "student"
  },
  "actions": [
    {
      "type": "SEND_EMAIL",
      "to": "{{user.email}}",
      "subject": "Welcome {{user.name}}",
      "body": "<p>Hello {{user.name}}, welcome to our platform</p>"
    }
  ]
}
```

## Admin Full Flow Rule

```json
{
  "name": "Admin Full Flow",
  "serviceName": "FLYGHOR_AUTH",
  "eventType": "USER_CREATED",
  "conditions": {
    "user.role": "admin",
    "user.phone": { "exists": true },
    "payment.amount": { "gt": 5000 }
  },
  "actions": [
    {
      "type": "SEND_NOTIFICATION",
      "channel": "APP",
      "eventName": "USER_CREATED",
      "title": "{{user.name}} Admin Joined",
      "message": "{{user.name}} Admin joined Our Platform",
      "payload": {
        "role": "{{user.role}}"
      },
      "priority": "NORMAL",
      "audienceType": "USER",
      "audienceKey": "{{user.id}}",
      "actionUrl": "/users/{{user.id}}",
      "entityType": "USER",
      "entityId": "{{user.id}}"
    },
    {
      "type": "SEND_EMAIL",
      "to": "{{user.email}}",
      "subject": "Admin Account Created",
      "body": "<p>Hello {{user.name}}</p>"
    },
    {
      "type": "SEND_WEBHOOK",
      "url": "https://api.system.com/admin",
      "method": "POST",
      "payload": {
        "id": "{{user.id}}"
      },
      "timeoutMs": 5000
    }
  ]
}
```

## SEND_NOTIFICATION

`SEND_NOTIFICATION` creates a `NotificationLog` row. The service name is resolved from the rule first, then the event payload, then a safe project fallback. The user target is resolved from `audienceKey`, `metadata.user.id`, or `actorId`.

Defaults:

- `channel`: `APP`
- `type`: `INFO`
- `priority`: `NORMAL`
- `audienceType`: `USER`

The pusher integration still sends a realtime notification when a `userId` can be resolved.

## Multiple Rules Per Event

The same `eventType` can have multiple rules. For example, `USER_CREATED` can have a student welcome email rule and an admin full-flow rule. Rules are ordered by `priority`, while actions inside each rule are ordered by `sortOrder`.
