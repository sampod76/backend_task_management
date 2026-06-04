# 📘 AutomationRule Documentation (Rule-Based Event Engine)

---

## 🧠 Overview

`AutomationRule` হলো একটি **Event-Driven Dynamic Rule Engine**

👉 সহজ ভাষায়:

**Event আসবে → condition match হলে → action execute হবে**

---

## 🏗️ Schema

```ts
model AutomationRule {
  id         String   @id @default(uuid())
  name       String
  eventType  String
  isActive   Boolean  @default(true)
  priority   Int      @default(100)
  conditions       AutomationRuleCondition[]
  actions          AutomationRuleAction[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

---

## 🧩 Field Explanation

### 🔹 id

- unique identifier

### 🔹 name

- rule এর নাম (admin panel এ দেখানোর জন্য)

### 🔹 eventType

- কোন event এ rule trigger হবে
- Example:
  - USER_CREATED
  - PAYMENT_SUCCESS

---

### 🔹 isActive

- rule enable / disable

| Value | Meaning  |
| ----- | -------- |
| true  | active   |
| false | inactive |

---

### 🔹 priority

- execution order control করে

👉 lower number = আগে execute

---

## 🔥 conditions (Core Logic)

👉 rule কখন trigger হবে তা define করে

👉 সব condition **AND logic** এ কাজ করে

---

## 🧠 Condition Types

### ✅ 1. Direct Match

```json
{
  "user.role": "admin"
}
```

👉 Meaning:

```
event.user.role === "admin"
```

---

### ✅ 2. Exists Condition

```json
{
  "user.phone": { "exists": true }
}
```

👉 Meaning:

```
user.phone must exist
```

---

### ❌ Exists False

```json
{
  "user.phone": { "exists": false }
}
```

👉 Meaning:

```
user.phone must NOT exist
```

---

### ✅ 3. Comparison

```json
{
  "user.age": { "gt": 18 }
}
```

👉 Operators:

| Operator | Meaning |
| -------- | ------- |
| gt       | >       |
| gte      | ≥       |
| lt       | <       |
| lte      | ≤       |
| ne       | !=      |
| eq       | ===     |

---

### Example: Range

```json
{
  "user.age": { "gte": 18, "lte": 60 }
}
```

---

### ✅ Multiple Conditions

```json
{
  "user.role": "admin",
  "user.age": { "gte": 18 },
  "user.phone": { "exists": true }
}
```

👉 সবগুলো match করতে হবে

---

## ⚡ actions (Execution Part)

👉 condition match হলে কি কাজ হবে

---

## 🧠 Action Types

### ✅ SEND_EMAIL

```json
{
  "type": "SEND_EMAIL",
  "to": "{{user.email}}",
  "subject": "Welcome {{user.name}}",
  "body": "<p>Hello {{user.name}}</p>"
}
```

---

### ✅ SEND_NOTIFICATION

```json
{
  "type": "SEND_NOTIFICATION",
  "title": "Welcome {{user.name}}",
  "message": "New user joined",
  "payload": {
    "id": "{{user.id}}",
    "bannerImage": "https://prnt.sc/q3Wm7jzxy7wr"
  }
}
```

---

### ✅ SEND_WEBHOOK

```json
{
  "type": "SEND_WEBHOOK",
  "url": "https://api.example.com",
  "payload": {
    "id": "{{user.id}}"
  }
}
```

---

## 🧠 Template System

👉 dynamic value ব্যবহার করা যায়

```json
"subject": "Hello {{user.name}}"
```

👉 runtime এ replace হবে

---

## 🔁 Execution Flow

1. Event trigger হয়
2. DB থেকে matching rules fetch হয়
3. priority অনুযায়ী sort হয়
4. condition match check হয়
5. actions execute হয়

---

## 🔥 Real Examples

### ✅ Student Email

```json
{
  "eventType": "USER_CREATED",
  "conditions": {
    "user.role": "student"
  },
  "actions": [
    {
      "type": "SEND_EMAIL",
      "to": "{{user.email}}",
      "subject": "Welcome {{user.name}}"
    }
  ]
}
```

---

### ✅ Admin Flow

```json
{
  "eventType": "USER_CREATED",
  "conditions": {
    "user.role": "admin"
  },
  "actions": [{ "type": "SEND_NOTIFICATION" }, { "type": "SEND_EMAIL" }]
}
```

---

### ✅ Fraud Detection

```json
{
  "eventType": "PAYMENT_FAILED",
  "conditions": {
    "retryCount": { "gt": 3 }
  },
  "actions": [{ "type": "ALERT_ADMIN" }]
}
```

---

## 🧠 Best Practices

### ✅ One Rule = One Responsibility

❌ Bad:

- one rule → many complex logic

✅ Good:

- multiple small rules

---

### ✅ Avoid Hardcoding

👉 সব logic DB driven রাখো

---

### ✅ Keep Conditions Simple

👉 complex logic avoid করো

---

## 🚀 Future Improvements

- OR condition support
- stopOnMatch
- retry system
- audit log
- rule analytics dashboard
- Kafka integration

---

## 🎯 Summary

| Field      | কাজ             |
| ---------- | --------------- |
| eventType  | কখন trigger হবে |
| conditions | কখন run হবে     |
| actions    | কি করবে         |
| priority   | execution order |
| isActive   | enable/disable  |

---

## 💡 Final Thought

👉
**AutomationRule = Backend No-Code Automation Engine**

👉
Code না লিখেই business logic control করা যাবে 🚀

---
