# 📘 RuleEngineService — Short Overview

---

## 🧠 What is this?

`RuleEngineService` হলো একটি **dynamic automation engine**

👉 কাজ:
**Event → Rule Match → Action Execute**

---

## ⚙️ Core Flow

1. event trigger হয়
2. DB থেকে matching rules আসে
3. condition match করা হয়
4. matched rules এর actions run হয়

---

## 🔧 Key Components

---

### 🔹 process()

👉 entry point
→ event receive করে এবং পুরো flow চালায়

---

### 🔹 matchConditions()

👉 rule match করার brain

Supports:

- direct match → `{ user.role: "admin" }`
- exists → `{ user.phone: { exists: true } }`
- comparison → `{ user.age: { gt: 18 } }`

👉 সব condition AND logic

---

### 🔹 executeRule()

👉 matched rule এর actions execute করে

Supports:

- SEND_EMAIL
- SEND_NOTIFICATION
- SEND_WEBHOOK (pending)

---

### 🔹 resolveTemplate()

👉 `{{ }}` dynamic value replace করে

```ts
"Hello {{user.name}}" → "Hello Rahim"
```

---

### 🔹 getByPath()

👉 nested object থেকে value বের করে

```ts
'user.profile.email';
```

---

## ⚠️ System Behavior

- rule condition → AND logic
- actions → sequential execution
- template → dynamic resolve
- unknown action → safe warning

---

## 🎯 Summary

👉
**RuleEngine = DB-driven backend automation system**

👉
code না লিখেও business logic control করা যায়

---
