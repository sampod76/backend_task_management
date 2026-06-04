# User and Admin API Requests

Use a bearer token for every request below.

## Create User

```http
POST /users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "john@example.com",
  "username": "john",
  "password": "Password123!",
  "role": "user",
  "accountType": "custom"
}
```

## Register Admin User With Profile

```http
POST /users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "admin@example.com",
  "username": "admin",
  "password": "Password123!",
  "role": "admin",
  "accountType": "custom",
  "admin": {
    "firstName": "Admin",
    "lastName": "User",
    "phone": "+8801700000000",
    "address": "Dhaka"
  }
}
```

## List Users

```http
GET /users?page=1&limit=20&sortBy=createdAt&sortOrder=desc&role=user&status=active
Authorization: Bearer <access_token>
```

## Get User

```http
GET /users/0fb77b38-3dc1-4b74-aeb4-0c34d2f52dd8
Authorization: Bearer <access_token>
```

## Update User

```http
PATCH /users/0fb77b38-3dc1-4b74-aeb4-0c34d2f52dd8
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "blocked",
  "isEmailVerified": true
}
```

## Soft Delete User

```http
DELETE /users/0fb77b38-3dc1-4b74-aeb4-0c34d2f52dd8
Authorization: Bearer <access_token>
```

## Create Admin Profile

```http
POST /admins
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "userId": "0fb77b38-3dc1-4b74-aeb4-0c34d2f52dd8",
  "firstName": "Admin",
  "lastName": "User",
  "phone": "+8801700000000",
  "address": "Dhaka"
}
```

## List Admin Profiles

```http
GET /admins?page=1&limit=20&sortBy=createdAt&sortOrder=desc&search=Admin
Authorization: Bearer <access_token>
```

## Get Admin Profile

```http
GET /admins/2a5d0104-c91d-412d-9fa3-cb7927387974
Authorization: Bearer <access_token>
```

## Update Admin Profile

```http
PATCH /admins/2a5d0104-c91d-412d-9fa3-cb7927387974
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "phone": "+8801711111111",
  "address": "Banani, Dhaka"
}
```
