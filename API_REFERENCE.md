# API Reference - Open Banking Dashboard

This document provides a comprehensive reference for all API endpoints in the Open Banking Dashboard application. It's intended for developers who need to understand the API structure for integration, testing, or extension purposes.

## Table of Contents

- [Authentication APIs](#authentication-apis)
- [Bank APIs](#bank-apis)
- [Account APIs](#account-apis)
- [Transaction APIs](#transaction-apis)
- [Error Handling](#error-handling)
- [Response Formats](#response-formats)

## Base URL

All API endpoints are relative to the base URL:

```
/api
```

For example, the login endpoint would be `/api/auth/login`.

## Authentication APIs

### Login

Authenticates a user and returns a token.

**Endpoint**: `POST /auth/login`

**Request Body**:

```json
{
  "username": "string",
  "password": "string"
}
```

**Response**:

```json
{
  "success": true,
  "token": "string",
  "message": "string (optional)"
}
```

**Status Codes**:

- 200: Successful authentication
- 400: Missing username or password
- 401: Invalid credentials
- 500: Server error

**Notes**:

- The token is also set as an HttpOnly cookie named `obp_token`
- Token expiration is set to 7 days

### Register

Registers a new user and creates an initial bank account.

**Endpoint**: `POST /auth/register`

**Request Body**:

```json
{
  "username": "string",
  "password": "string",
  "bankId": "string (optional, default: obp-sandbox-20202024)",
  "accountType": "string (optional, default: CURRENT)",
  "accountLabel": "string (optional, default: Primary Account)",
  "currency": "string (optional, default: USD)",
  "initialBalance": "string (optional, default: 100.00)"
}
```

**Response**:

```json
{
  "success": true,
  "message": "string",
  "account": {
    "id": "string",
    "label": "string",
    "bank_id": "string",
    "type": "string",
    "balance": {
      "amount": "string",
      "currency": "string"
    },
    "account_routings": [
      {
        "scheme": "string",
        "address": "string"
      }
    ],
    "views_available": ["string"]
  }
}
```

**Status Codes**:

- 200: Successful registration
- 400: Missing required fields
- 500: Server error

### Logout

Logs out the current user by clearing the authentication token.

**Endpoint**: `POST /auth/logout`

**Response**:

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Status Codes**:

- 200: Successfully logged out
- 500: Server error

**Notes**:

- This endpoint clears the `obp_token` cookie
- No request body is required

### Test Connection

Tests if the current authentication is valid.

**Endpoint**: `GET /test-connection`

**Query Parameters**:

- `client`: boolean - Whether this is a client-side request
- `refresh`: boolean - Whether to attempt to refresh authentication

**Response**:

```json
{
  "success": true,
  "authenticated": true,
  "message": "string (optional)"
}
```

**Status Codes**:

- 200: Connection test completed
- 401: Not authenticated
- 500: Server error

## Bank APIs

### Get Banks

Retrieves a list of available banks.

**Endpoint**: `GET /banks`

**Response**:

```json
{
  "banks": [
    {
      "id": "string",
      "short_name": "string",
      "full_name": "string",
      "logo": "string",
      "website": "string"
    }
  ]
}
```

**Status Codes**:

- 200: Successfully retrieved banks
- 401: Not authenticated
- 500: Server error

## Account APIs

### Get Accounts

Retrieves accounts for a specific bank.

**Endpoint**: `GET /accounts/{bankId}`

**URL Parameters**:

- `bankId`: string - The ID of the bank

**Response**:

```json
{
  "accounts": [
    {
      "id": "string",
      "label": "string",
      "bank_id": "string",
      "type": "string",
      "balance": {
        "amount": "string",
        "currency": "string"
      },
      "account_routings": [
        {
          "scheme": "string",
          "address": "string"
        }
      ],
      "views_available": ["string"]
    }
  ]
}
```

**Status Codes**:

- 200: Successfully retrieved accounts
- 401: Not authenticated
- 404: Bank not found
- 500: Server error

### Create Account

Creates a new bank account.

**Endpoint**: `POST /accounts/create`

**Request Body**:

```json
{
  "bankId": "string",
  "username": "string",
  "password": "string",
  "accountType": "string (optional, default: CURRENT)",
  "accountLabel": "string",
  "currency": "string (optional, default: USD)",
  "initialBalance": "string (optional, default: 100.00)"
}
```

**Response**:

```json
{
  "success": true,
  "message": "string",
  "account": {
    "id": "string",
    "label": "string",
    "bank_id": "string",
    "type": "string",
    "balance": {
      "amount": "string",
      "currency": "string"
    },
    "account_routings": [
      {
        "scheme": "string",
        "address": "string"
      }
    ],
    "views_available": ["string"]
  }
}
```

**Status Codes**:

- 200: Successfully created account
- 400: Missing required fields
- 401: Not authenticated
- 500: Server error

### Send Money

Transfers money between accounts.

**Endpoint**: `POST /accounts/{bankId}/send`

**URL Parameters**:

- `bankId`: string - The ID of the bank

**Request Body**:

```json
{
  "fromAccountId": "string",
  "toAccountId": "string",
  "amount": "string",
  "description": "string (optional)"
}
```

**Response**:

```json
{
  "success": true,
  "message": "string",
  "transaction": {
    "id": "string",
    "type": "string",
    "description": "string",
    "amount": "string",
    "currency": "string",
    "date": "string (ISO format)",
    "status": "string",
    "fromAccount": "string",
    "toAccount": "string"
  }
}
```

**Status Codes**:

- 200: Successfully transferred money
- 400: Invalid parameters
- 401: Not authenticated
- 404: Account not found
- 500: Server error

### Top Up Account

Adds funds to an account (simulated).

**Endpoint**: `POST /accounts/{bankId}/topup`

**URL Parameters**:

- `bankId`: string - The ID of the bank

**Request Body**:

```json
{
  "accountId": "string",
  "amount": "string",
  "method": "string (optional)"
}
```

**Response**:

```json
{
  "success": true,
  "message": "string",
  "transaction": {
    "id": "string",
    "type": "string",
    "description": "string",
    "amount": "string",
    "currency": "string",
    "date": "string (ISO format)",
    "status": "string",
    "toAccount": "string"
  }
}
```

**Status Codes**:

- 200: Successfully topped up account
- 400: Invalid parameters
- 401: Not authenticated
- 404: Account not found
- 500: Server error

## Transaction APIs

### Get Transactions

Retrieves transactions for a specific account.

**Endpoint**: `GET /transactions/{bankId}/{accountId}/{viewId}`

**URL Parameters**:

- `bankId`: string - The ID of the bank
- `accountId`: string - The ID of the account
- `viewId`: string - The view ID (usually "owner")

**Query Parameters**:

- `sort`: string - Sort order (ASC or DESC)
- `limit`: number - Maximum number of transactions to return
- `offset`: number - Offset for pagination
- `fromDate`: string - Start date filter (ISO format)
- `toDate`: string - End date filter (ISO format)

**Response**:

```json
{
  "transactions": [
    {
      "id": "string",
      "type": "string",
      "description": "string",
      "amount": "string",
      "currency": "string",
      "date": "string (ISO format)",
      "status": "string",
      "accountId": "string",
      "counterpartyName": "string (optional)",
      "counterpartyAccount": "string (optional)"
    }
  ]
}
```

**Status Codes**:

- 200: Successfully retrieved transactions
- 401: Not authenticated
- 404: Account not found
- 500: Server error

### Get Transaction Details

Retrieves detailed information for a specific transaction.

**Endpoint**: `GET /transactions/{bankId}/details/{transactionId}`

**URL Parameters**:

- `bankId`: string - The ID of the bank
- `transactionId`: string - The ID of the transaction

**Response**:

```json
{
  "transaction": {
    "id": "string",
    "type": "string",
    "description": "string",
    "amount": "string",
    "currency": "string",
    "date": "string (ISO format)",
    "status": "string",
    "accountId": "string",
    "counterpartyName": "string (optional)",
    "counterpartyAccount": "string (optional)",
    "metadata": {
      "narrative": "string (optional)",
      "comments": "string (optional)",
      "tags": ["string"](optional),
      "images": ["string"](optional)
    }
  }
}
```

**Status Codes**:

- 200: Successfully retrieved transaction details
- 401: Not authenticated
- 404: Transaction not found
- 500: Server error

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "string",
  "details": {
    "field": "string (optional)",
    "error": "string (optional)"
  }
}
```

Common error codes:

- 400: Bad Request (invalid parameters or body)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Not Found (resource doesn't exist)
- 500: Internal Server Error (server-side issue)

## Response Formats

### Success Response

Standard success response format:

```json
{
  "success": true,
  "message": "string (optional)",
  "data": {} // Optional data object (varies by endpoint)
}
```

### Pagination Response

For endpoints that support pagination:

```json
{
  "success": true,
  "data": [], // Array of items
  "pagination": {
    "total": "number",
    "page": "number",
    "perPage": "number",
    "pages": "number",
    "next": "number (optional)",
    "prev": "number (optional)"
  }
}
```

## Authentication

Most API endpoints require authentication. Include the authentication token in one of the following ways:

1. **HttpOnly Cookie**: The preferred method (automatically set after login)
2. **Authorization Header**: For server-to-server communication
   ```
   Authorization: DirectLogin token="your-token-here"
   ```

## Testing the API

You can use the provided test scripts to verify API functionality:

- `scripts/test-banks-api.js`: Tests the banks API
- `scripts/test-curl.js`: Simulates curl requests
- `scripts/test-full-flow.js`: Tests the full authentication and data retrieval flow
- `scripts/test-register-fix.js`: Tests user registration
- `scripts/verify-server-api-fix.js`: Verifies server API fixes

Example:

```bash
node scripts/test-banks-api.js
```

---

This API reference is based on the implementation as of the current version. The API may evolve over time, so always verify endpoints in the actual code.
