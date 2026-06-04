# 🧠 AuditLogQueryBuilder — Full Beginner Guide (Bangla)

এই ডকুমেন্টে তুমি শিখবে:

- Query Builder কী
- Chaining কীভাবে কাজ করে
- Step-by-step flow
- Real production usage
- কেন এটা important

---

# 🎯 1. Query Builder কী?

👉 Query Builder হলো একটা class যা:

> API থেকে আসা filter → Database query (Prisma where) বানায়

---

## 🔥 Problem (Without Builder)

```ts
if (query.search) { ... }
if (query.eventType) { ... }
if (query.serviceName) { ... }
```

❌ messy
❌ repeated
❌ hard to maintain

---

## ✅ Solution (With Builder)

```ts
const where = new AuditLogQueryBuilder()
  .addSearch(query.search)
  .addFilters(query)
  .addDateRange(query.fromDate, query.toDate)
  .build();
```

✔ clean
✔ readable
✔ scalable

---

# 🧠 2. Chaining কী?

👉 Chaining মানে:

> একটার পর একটা method call করা

---

## 🔥 Example

```ts
class Test {
  a() {
    console.log('A');
    return this;
  }

  b() {
    console.log('B');
    return this;
  }
}
```

👉 Use:

```ts
new Test().a().b();
```

👉 Output:

```
A
B
```

---

## 🎯 Key Rule

👉 chaining কাজ করে কারণ:

```ts
return this;
```

---

# 🧱 3. AuditLogQueryBuilder Structure

```ts
class AuditLogQueryBuilder {
  private where = {};

  addSearch() { ... return this; }
  addFilters() { ... return this; }
  addDateRange() { ... return this; }

  build() {
    return this.where;
  }
}
```

---

# 🔍 4. Step-by-Step Execution

## Step 1

```ts
const builder = new AuditLogQueryBuilder();
```

👉 where:

```ts
{
  deletedAt: null;
}
```

---

## Step 2

```ts
builder.addSearch('user');
```

👉 adds:

```ts
OR: [{ eventType: { contains: 'user' } }, { entity: { contains: 'user' } }];
```

---

## Step 3

```ts
builder.addFilters({ serviceName: 'AUTH' });
```

👉 adds:

```ts
serviceName: 'AUTH';
```

---

## Step 4

```ts
builder.addDateRange(from, to);
```

👉 adds:

```ts
createdAt: {
  gte: from,
  lte: to
}
```

---

## Step 5

```ts
builder.build();
```

👉 Final result:

```ts
{
  deletedAt: null,
  serviceName: "AUTH",
  createdAt: { ... },
  OR: [...]
}
```

---

# 🎯 5. Real Flow (Production)

## 📥 Client Request

```
GET /audit-log?search=user&serviceName=AUTH
```

---

## 📡 Controller

```ts
findAll(@Query() query) {
  return this.service.findAll(query);
}
```

---

## ⚙️ Service

```ts
const where = new AuditLogQueryBuilder()
  .addSearch(query.search)
  .addFilters(query)
  .build();

return this.repo.findMany({ where });
```

---

## 🗄️ Database

```ts
SELECT * FROM audit_logs
WHERE serviceName = 'AUTH'
AND deletedAt IS NULL
```

---

# 🧠 6. Why Builder Important?

| Without         | With Builder |
| --------------- | ------------ |
| messy code      | clean        |
| duplicate logic | reusable     |
| hard debug      | easy         |
| not scalable    | scalable     |

---

# 🚀 7. Advanced Use Case

## 🔥 Multiple Filter

```ts
eventType: ['USER_CREATED', 'USER_UPDATED'];
```

👉 Prisma:

```ts
eventType: { in: [...] }
```

---

## 🔥 Search + Filter + Date

সব combine cleanভাবে হয়

---

# 🧠 8. Big Production Reality

Netflix / Uber / Stripe style system:

✔ millions logs
✔ complex filters
✔ dynamic queries

👉 তারা use করে:

- Query Builder
- Search Engine
- Filter Pipeline

---

# 🎯 9. Mental Model

ভাবো:

👉 Builder = একটা খালি object
👉 Method = field add করা
👉 build() = final object

---

# 🏁 Final Summary

👉 Query Builder =

> API filter → safe database query translator

---

# 🔥 Your Level Now

তুমি এখন:

✔ Backend intermediate+
✔ Production pattern use করছো

---

# 🚀 Next Upgrade

তুমি চাইলে আমি দেখাতে পারি:

👉 Generic QueryBuilder (সব module-এ use)
👉 Mongo-style filter system
👉 Elasticsearch integration

---

# ❤️ শেষ কথা

👉 Builder concept শিখলে:

- clean code লিখতে পারবে
- scalable system বানাতে পারবে
- senior level design বুঝবে

---

🔥 Keep going!
