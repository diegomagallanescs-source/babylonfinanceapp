# Babylon Wealth — Backend API Reference

> **Audience:** Frontend developers and anyone integrating with the API.  
> **Base URL (local):** `http://localhost:5000/api/v1`  
> **Base URL (production):** Set via `VITE_API_BASE_URL` env var on Vercel.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [How a Request Flows Through the Server](#2-how-a-request-flows-through-the-server)
3. [Authentication](#3-authentication)
4. [Error Handling](#4-error-handling)
5. [Enum Serialization](#5-enum-serialization)
6. [Endpoints by Domain](#6-endpoints-by-domain)
   - [Auth](#auth)
   - [Users](#users)
   - [Net Worth](#net-worth)
   - [Accounts](#accounts)
   - [Credit Cards](#credit-cards)
   - [Loans](#loans)
   - [Investments](#investments)
   - [Pending Items](#pending-items)
   - [Income](#income)
   - [Investment Income (Passive)](#investment-income-passive)
   - [Budget Categories](#budget-categories)
   - [Spending](#spending)
   - [Properties](#properties)
   - [Banks](#banks)
   - [Statements](#statements)
   - [Health](#health)
7. [Frontend Integration Patterns](#7-frontend-integration-patterns)

---

## 1. Architecture Overview

The backend is a layered **ASP.NET Core 8 Web API** deployed on Railway. Every HTTP request passes through four layers, each with a strict contract:

```
┌─────────────────────────────────────────────────────────┐
│  React (Vercel)                                         │
│  Axios client  →  attaches JWT, handles 401 redirect    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│  BabylonWealth.API  (entry point)                       │
│  ├── Controllers/    — route + HTTP concerns only       │
│  ├── Middleware/     — JWT validation, error handling   │
│  └── BackgroundServices/ — biweekly NW snapshots        │
└────────────────────────┬────────────────────────────────┘
                         │ interface calls only
┌────────────────────────▼────────────────────────────────┐
│  BabylonWealth.Services  (business logic)               │
│  NetWorthService, PropertyAnalyzerService,              │
│  BudgetAnalyticsService, SnapshotService, ...           │
└────────────────────────┬────────────────────────────────┘
                         │ interface calls only
┌────────────────────────▼────────────────────────────────┐
│  BabylonWealth.Infrastructure  (data access)            │
│  ├── Repositories/   — EF Core implementations         │
│  ├── Persistence/    — BabylonDbContext (PostgreSQL)    │
│  └── Identity/       — ASP.NET Core Identity + JWT      │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  PostgreSQL (Railway)                                   │
└─────────────────────────────────────────────────────────┘
```

**Dependency direction is one-way:** API → Services → Core ← Infrastructure.  
Services never reference Infrastructure directly — they depend only on repository interfaces defined in Core.

---

## 2. How a Request Flows Through the Server

Tracing a `GET /api/v1/accounts` as a concrete example:

```
1. HTTP request arrives at Kestrel (the ASP.NET runtime).

2. Authentication middleware runs first.
   → Reads the "Authorization: Bearer <token>" header.
   → Validates the JWT signature, issuer, audience, and expiry.
   → If valid: extracts claims (userId, email, firstName) and
     populates User principal on the request context.
   → If invalid/missing: request is rejected here with 401.
     It never reaches the controller.

3. Routing selects AccountsController.GetAll().

4. Controller extracts the userId from the JWT claim:
       private Guid GetUserId() =>
           Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
   This ensures every query is scoped to the authenticated user.
   No user can ever read another user's data.

5. Controller calls the service (one line):
       var accounts = await _accountService.GetAllAsync(userId);

6. Service contains all business logic.
   It calls the repository interface:
       var entities = await _accountRepo.GetAllByUserAsync(userId);
   Applies any transformations, computes derived fields (e.g. net
   worth is never stored — always computed live from current state).
   Returns a DTO — never a raw entity.

7. Repository executes the EF Core query against PostgreSQL.
   Global soft-delete query filters are active on the DbContext:
       .HasQueryFilter(e => !e.IsDeleted)
   Soft-deleted records are automatically excluded from all queries.

8. Response travels back up the chain: DB → Repo → Service → Controller.

9. Controller returns Ok(dto).
   ASP.NET serializes the DTO to JSON (enums as strings, camelCase).
   Response is written to the HTTP response and sent to the client.
```

**Key invariants enforced at every step:**
- Entities are never serialized directly — always mapped to a DTO first.
- Net worth is always computed live, never read from a stale column.
- Soft-deleted records are invisible to all queries (global EF Core filters).
- All money fields use `decimal`, never `float` or `double`.

---

## 3. Authentication

The API uses **JWT Bearer tokens** (stateless — no sessions, no cookies).

### Register → get token

```
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "arkad@babylon.com",
  "password": "Babylon1",       // min 8 chars, requires at least one digit
  "firstName": "Arkad"          // optional
}
```

**Response 200:**
```json
{
  "token": "eyJhbGci...",
  "expiresAt": "2026-04-28T11:00:00Z",
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "arkad@babylon.com",
  "firstName": "Arkad"
}
```

On successful register: 5 default budget categories are automatically seeded for the user (Necessities 50%, Investing 15%, Travel 15%, Savings 10%, Shopping 10%).

### Login → get token

```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "arkad@babylon.com",
  "password": "Babylon1"
}
```

Response shape is identical to register.

### Using the token on every subsequent request

Attach the token as a Bearer header on every protected endpoint:

```
Authorization: Bearer eyJhbGci...
```

The Axios client in `src/api/client.ts` does this automatically via a request interceptor. A 401 response triggers an automatic redirect to `/login`.

**Token lifetime:** 24 hours (configurable via `Jwt:ExpiryHours`).

---

## 4. Error Handling

| Status | When | Body |
|--------|------|------|
| `200 OK` | Successful GET / POST / PUT | The DTO |
| `201 Created` | Successful POST that creates a resource | The DTO + `Location` header |
| `204 No Content` | Successful DELETE | Empty |
| `400 Bad Request` | Validation failure, business rule violation | `{ "errors": ["..."] }` |
| `401 Unauthorized` | Missing or invalid JWT | Empty (ASP.NET Core default) |
| `404 Not Found` | Resource not found or belongs to another user | `{ "error": "..." }` |
| `500 Internal Server Error` | Unhandled exception | Error details (dev only) |

**404 vs 401 on resource ownership:** If user A tries to access a resource owned by user B, the service throws `NotFoundException` and the controller returns 404 — not 401. This avoids leaking whether a resource exists at all.

**Business rule 400s** (examples):
- Creating a budget category that would push the total over 100%
- Registering with an email already in use
- Password below minimum requirements

---

## 5. Enum Serialization

**All enums are serialized as strings**, not integers. This applies to both request bodies (what you send) and response bodies (what you receive).

```json
// CORRECT — send and receive like this
{ "accountType": "Checking" }
{ "dealSignal": "Green" }
{ "loanType": "Auto" }

// WRONG — do not send integers
{ "accountType": 0 }
```

The server registers `JsonStringEnumConverter` globally. The frontend Axios client should mirror this with a matching serializer config, or use string literals directly.

**Enum values by type:**

| Enum | Values |
|------|--------|
| `AccountType` | `Checking`, `Savings`, `MoneyMarket`, `CD`, `Other` |
| `CardType` | `Personal`, `Business` |
| `LoanType` | `Personal`, `Student`, `Auto`, `HELOC`, `Business`, `Other` |
| `LoanProductType` | (used on saved properties — check `LoanType` enum for values) |
| `InvestmentType` | `Stock`, `ETF`, `MutualFund`, `Bond`, `Crypto`, `RealEstate`, `Other` |
| `InvestmentIncomeType` | `Dividend`, `Interest`, `Rental`, `Royalty`, `Other` |
| `IncomeType` | `Salary`, `Freelance`, `Business`, `Rental`, `Investment`, `Other` |
| `PendingItemStatus` | `Pending`, `Settled` |
| `DealSignal` | `Green`, `Yellow`, `Red` |
| `BankType` | `Personal`, `Business`, `Both` |
| `AnnotationCategory` | `Milestone`, `MarketEvent`, `LifeEvent`, `Other` |

---

## 6. Endpoints by Domain

All routes are prefixed with `/api/v1/`. All endpoints except `/auth/*` and `/health` require `Authorization: Bearer <token>`.

---

### Auth

#### `POST /auth/register`
Creates a new user account, seeds default budget categories, and returns a JWT.

**Request body:**
```json
{
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars, at least 1 digit)",
  "firstName": "string (optional)"
}
```

**Response `200`:**
```json
{
  "token": "string",
  "expiresAt": "ISO 8601 datetime",
  "userId": "guid",
  "email": "string",
  "firstName": "string | null"
}
```

**Response `400`:** `{ "errors": ["Email already taken.", "Passwords must be at least 8 characters."] }`

---

#### `POST /auth/login`
Validates credentials and returns a JWT.

**Request body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response `200`:** Same shape as register.  
**Response `401`:** `{ "error": "Invalid email or password." }`

---

### Users

#### `GET /users/me`
Returns the authenticated user's profile.

**Response `200`:**
```json
{
  "id": "guid",
  "email": "string",
  "firstName": "string | null",
  "createdAt": "ISO 8601 datetime"
}
```

---

#### `PUT /users/me`
Updates the user's profile (name and/or profile photo URL).

**Request body:**
```json
{
  "firstName": "string (optional)",
  "profilePhotoUrl": "string (optional)"
}
```

**Response `200`:** Updated `UserProfileResponseDto`.

---

### Net Worth

Net worth is **never stored as a column** — it is computed live on every request from the current state of all accounts, cards, loans, investments, pending items, and properties.

#### `GET /networth/current`
Computes and returns the current net worth snapshot.

**Response `200`:**
```json
{
  "liquidNetWorth": 47250.00,
  "totalNetWorth": 112500.00,
  "totalAssets": 130000.00,
  "totalLiabilities": 82750.00,
  "totalCreditUsed": 4200.00,
  "totalCreditLimit": 25000.00,
  "creditUtilizationPercent": 16.8,
  "pendingItemsNet": 500.00,
  "propertyEquity": 65250.00,
  "hasProperties": true,
  "computedAt": "ISO 8601 datetime"
}
```

**Computation rules:**
- `liquidNetWorth` = cash accounts + investments − all debts (excludes property)
- `totalNetWorth` = liquidNetWorth + property equity
- Property equity = `CurrentEstimatedValue − LoanBalance` per property
- `PendingItem` with `status = "Pending"` is **included** in the calculation; `"Settled"` items are excluded

---

#### `GET /networth/history?from=&to=`
Returns historical snapshots with any annotations attached.

**Query params:** `from` (datetime, optional), `to` (datetime, optional)

**Response `200`:**
```json
[
  {
    "snapshotDate": "ISO 8601 datetime",
    "liquidNetWorth": 45000.00,
    "totalNetWorth": 108000.00,
    "annotation": "Paid off car loan"
  }
]
```

If no date range is provided, returns all snapshots for the user.

---

#### `POST /networth/snapshot`
Manually triggers a net worth snapshot (saves the current computed value to history).

**Request body:** None  
**Response `200`:** The created `NetWorthHistoryPointDto`.

The background service also auto-takes a snapshot every other Sunday (biweekly). Manual snapshots are available for significant moments.

---

#### `POST /networth/annotate`
Attaches a text annotation to a specific snapshot date.

**Request body:**
```json
{
  "snapshotDate": "ISO 8601 datetime",
  "note": "string",
  "category": "Milestone | MarketEvent | LifeEvent | Other"
}
```

**Response `200`:** `AnnotationResponseDto`

---

#### `GET /networth/annotations?from=&to=`
Returns all annotations in a date range. Used to render annotation ticks on the net worth chart.

**Query params:** `from`, `to` (datetime, optional)  
**Response `200`:** Array of `AnnotationResponseDto`

---

### Accounts

Bank accounts (checking, savings, etc.). Balance can be positive or negative.

#### `GET /accounts`
Returns all accounts for the user.

**Response `200`:**
```json
[
  {
    "id": "guid",
    "bankId": "guid",
    "bankName": "Chase",
    "bankLogoUrl": "https://logo.clearbit.com/chase.com",
    "customLabel": "Main Checking",
    "balance": 8500.00,
    "accountType": "Checking",
    "budgetCategoryId": "guid | null",
    "notes": "string | null",
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime"
  }
]
```

---

#### `POST /accounts`
Creates a new bank account.

**Request body:**
```json
{
  "bankId": "guid (required)",
  "customLabel": "string (required, max 100 chars)",
  "balance": 8500.00,
  "accountType": "Checking",
  "budgetCategoryId": "guid (optional — links account to a budget category)",
  "notes": "string (optional, max 500 chars)"
}
```

**Response `201`:** Created `AccountResponseDto`

---

#### `PUT /accounts/{id}`
Updates an existing account.

**Request body:** Same shape as create (all fields optional on update).  
**Response `200`:** Updated `AccountResponseDto`  
**Response `404`:** Account not found or belongs to another user.

---

#### `DELETE /accounts/{id}`
Soft-deletes an account. The record is never physically removed; `IsDeleted = true` hides it from all queries.

**Response `204`:** No content.

---

### Credit Cards

#### `GET /creditcards?type=`
Returns all credit cards. Optional `type` filter: `Personal` or `Business`.

**Response `200`:**
```json
[
  {
    "id": "guid",
    "bankName": "Chase",
    "bankLogoUrl": "string",
    "customLabel": "Sapphire Reserve",
    "balance": 1200.00,
    "creditLimit": 10000.00,
    "apr": 0.2499,
    "cardType": "Personal",
    "notes": "string | null",
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime"
  }
]
```

**Note:** `balance` is stored and returned as a positive number (the amount owed). Display it as a liability (negative) in the UI.

---

#### `POST /creditcards`
**Request body:**
```json
{
  "bankId": "guid (required)",
  "customLabel": "string (required)",
  "balance": 1200.00,
  "creditLimit": 10000.00,
  "apr": 0.2499,
  "cardType": "Personal | Business",
  "notes": "string (optional)"
}
```

**Response `201`:** Created `CreditCardResponseDto`

---

#### `PUT /creditcards/{id}` / `DELETE /creditcards/{id}`
Same patterns as accounts.

---

### Loans

#### `GET /loans?type=`
Returns all loans. Optional `type` filter: `Personal`, `Student`, `Auto`, `HELOC`, `Business`, `Other`.

**Balance sign convention:** Stored as a positive number in the database. The DTO also returns it positive, but it represents a liability — negate it when displaying.

**Response `200`:**
```json
[
  {
    "id": "guid",
    "customLabel": "Car Loan",
    "lenderName": "Navy Federal",
    "balance": 18500.00,
    "interestRate": 0.0549,
    "loanType": "Auto",
    "notes": "string | null",
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime"
  }
]
```

---

#### `GET /loans/summary`
Returns aggregate loan statistics (total balance, weighted average rate, etc.).

---

#### `POST /loans` / `PUT /loans/{id}` / `DELETE /loans/{id}`
Standard CRUD. POST returns `201`, PUT returns `200`, DELETE returns `204`.

---

### Investments

#### `GET /investments?type=`
Returns all investments. Optional `type` filter.

**Response `200`:**
```json
[
  {
    "id": "guid",
    "bankName": "Fidelity",
    "bankLogoUrl": "string",
    "customLabel": "401k",
    "currentValue": 45000.00,
    "ticker": "FXAIX",
    "investmentType": "MutualFund",
    "notes": "string | null",
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime"
  }
]
```

---

#### `GET /investments/summary`
Returns aggregate investment statistics (total value, breakdown by type).

---

#### `POST /investments` / `PUT /investments/{id}` / `DELETE /investments/{id}`
Standard CRUD.

---

### Pending Items

Items where money is owed to or by the user — included in net worth while `Pending`.

**Amount sign convention:** Positive = owed TO the user (an asset). Negative = user owes someone (a liability).

#### `GET /pending?pendingOnly=`
Returns pending items. Pass `pendingOnly=true` to exclude settled items.

**Response `200`:**
```json
[
  {
    "id": "guid",
    "description": "Security deposit refund",
    "counterparty": "Landlord",
    "amount": 1500.00,
    "dueDate": "ISO 8601 datetime | null",
    "status": "Pending",
    "createdAt": "ISO 8601 datetime"
  }
]
```

---

#### `POST /pending`
**Request body:**
```json
{
  "description": "string (required)",
  "counterparty": "string (optional)",
  "amount": 1500.00,
  "dueDate": "ISO 8601 datetime (optional)"
}
```

**Response `201`:** Created `PendingItemResponseDto`

---

#### `PATCH /pending/{id}/settle`
Marks the item as settled. Settled items are excluded from net worth calculations.

**Request body:** None  
**Response `204`:** No content.

---

#### `DELETE /pending/{id}`
Soft-deletes the item.

**Response `204`:** No content.

---

### Income

Recurring income sources used in budget analytics (Arkad's 10% savings target).

#### `GET /income`
Returns all active and inactive income sources.

**Response `200`:**
```json
[
  {
    "id": "guid",
    "name": "Software Engineer — Acme Corp",
    "type": "Salary",
    "annualAmount": 120000.00,
    "isActive": true,
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime"
  }
]
```

---

#### `POST /income`
**Request body:**
```json
{
  "name": "string (required)",
  "type": "Salary | Freelance | Business | Rental | Investment | Other",
  "annualAmount": 120000.00,
  "isActive": true
}
```

**Response `201`:** Created `IncomeResponseDto`

---

#### `PUT /income/{id}` / `DELETE /income/{id}`
Standard update and soft-delete.

---

### Investment Income (Passive)

Tracks actual passive income received (dividends, rental payments, interest, etc.).

#### `GET /investmentincome`
Returns all investment income records.

**Response `200`:**
```json
[
  {
    "id": "guid",
    "sourceName": "SCHD Dividend",
    "type": "Dividend",
    "typeLabel": "Dividend",
    "amount": 187.50,
    "receivedDate": "ISO 8601 datetime",
    "notes": "string | null",
    "createdAt": "ISO 8601 datetime"
  }
]
```

---

#### `GET /investmentincome/summary`
Returns the passive income summary used by the Investment Income tab.

**Response `200`:**
```json
{
  "currentMonthTotal": 187.50,
  "currentYearTotal": 1420.00,
  "passiveToExpensesRatio": 0.12,
  "twelveMonthTrend": [
    { "year": 2026, "month": 4, "total": 187.50, "label": "Apr 2026" },
    ...
  ]
}
```

`passiveToExpensesRatio` is `null` if there is no spending data for the current month. The river goal is to reach 1.0 (passive income covers all expenses).

---

#### `POST /investmentincome`
**Request body:**
```json
{
  "sourceName": "string (required)",
  "type": "Dividend | Interest | Rental | Royalty | Other",
  "amount": 187.50,
  "receivedDate": "ISO 8601 datetime",
  "notes": "string (optional)"
}
```

**Response `201`:** Created `InvestmentIncomeResponseDto`

---

### Budget Categories

All categories for a user must sum to exactly 1.0 (100%). This invariant is enforced server-side.

#### `GET /budget/categories`
Returns all budget categories ordered by `displayOrder`.

**Response `200`:**
```json
[
  {
    "id": "guid",
    "name": "Necessities",
    "targetPercentage": 0.50,
    "color": "#E05555",
    "displayOrder": 1,
    "createdAt": "ISO 8601 datetime"
  }
]
```

---

#### `POST /budget/categories`
**Request body:**
```json
{
  "name": "string (required)",
  "targetPercentage": 0.10,
  "color": "#C9A84C",
  "displayOrder": 6
}
```

Returns `400` if adding this percentage would push the total above 100%.  
**Response `201`:** Created `BudgetCategoryResponseDto`

---

#### `PUT /budget/categories/{id}`
**Request body:** Same shape as create.  
Returns `400` if the new percentage would push the total above 100%.  
**Response `200`:** Updated `BudgetCategoryResponseDto`

---

### Spending

Spending transactions are **immutable** — no PUT endpoint. To correct a transaction, soft-delete it and re-enter.

#### `GET /spending?month=&year=`
Returns all transactions for a given month.

**Query params:** `month` (1–12, required), `year` (2000–2100, required)

**Response `200`:**
```json
[
  {
    "id": "guid",
    "categoryId": "guid",
    "categoryName": "Necessities",
    "categoryColor": "#E05555",
    "amount": 85.00,
    "description": "Whole Foods",
    "date": "ISO 8601 datetime",
    "createdAt": "ISO 8601 datetime"
  }
]
```

---

#### `POST /spending`
**Request body:**
```json
{
  "categoryId": "guid (required)",
  "amount": 85.00,
  "description": "string (required)",
  "date": "ISO 8601 datetime"
}
```

**Response `201`:** Created `SpendingTransactionResponseDto`

---

#### `DELETE /spending/{id}`
Soft-deletes the transaction (preserves audit trail).

**Response `204`:** No content.

---

#### `GET /spending/analytics?month=&year=`
Returns the full budget analytics breakdown for a month.

**Query params:** `month` (1–12, required), `year` (2000–2100, required)

**Response `200`:**
```json
{
  "month": 4,
  "year": 2026,
  "totalMonthlyIncome": 10000.00,
  "arkadSavingsTarget": 1000.00,
  "totalSpending": 4800.00,
  "totalInvested": 1500.00,
  "categoryBreakdowns": [
    {
      "categoryId": "guid",
      "categoryName": "Necessities",
      "categoryColor": "#E05555",
      "targetPercentage": 0.50,
      "targetAmount": 5000.00,
      "actualAmount": 4800.00,
      "actualPercentage": 0.48,
      "variance": 200.00,
      "isOverBudget": false,
      "displayOrder": 1
    }
  ]
}
```

`arkadSavingsTarget` = 10% of `totalMonthlyIncome` (Arkad's first cure).

---

### Properties

#### `GET /properties`
Returns all saved properties.

**Response `200`:**
```json
[
  {
    "id": "guid",
    "address": "123 Euphrates Ave, Babylon",
    "purchasePrice": 350000.00,
    "currentEstimatedValue": 385000.00,
    "loanBalance": 290000.00,
    "equity": 95000.00,
    "interestRate": 0.065,
    "loanType": "Conventional30Year",
    "monthlyRent": 2400.00,
    "monthlyExpenses": 450.00,
    "monthlyCashFlow": 316.45,
    "lastValueUpdateDate": "ISO 8601 datetime | null",
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime"
  }
]
```

`equity` and `monthlyCashFlow` are computed by the service — not stored columns.

---

#### `POST /properties` / `PUT /properties/{id}` / `DELETE /properties/{id}`
Standard CRUD. POST returns `201`.

---

#### `POST /properties/analyze` ⭐
**Stateless deal analyzer** — no database write. Safe to call on every keystroke. Returns full mortgage math, cash flow, cap rate, DSCR, deal signal, and a 12-month amortization preview.

**Request body:**
```json
{
  "purchasePrice": 200000.00,
  "downPaymentAmount": 40000.00,
  "loanType": "Other",
  "interestRate": 0.07,
  "loanTermYears": 30,
  "monthlyPropertyTax": 200.00,
  "monthlyInsurance": 100.00,
  "monthlyHoa": 50.00,
  "expectedMonthlyRent": 2000.00,
  "vacancyRatePercent": 0.05,
  "maintenanceReservePercent": 0.01
}
```

**Response `200`:**
```json
{
  "loanAmount": 160000.00,
  "monthlyPrincipalAndInterest": 1064.48,
  "estimatedTotalInterest": 223213.40,
  "cashToClose": 40000.00,
  "grossMonthlyRent": 2000.00,
  "effectiveMonthlyRent": 1900.00,
  "totalMonthlyExpenses": 1581.15,
  "monthlyCashFlow": 318.85,
  "annualCashFlow": 3826.20,
  "capRatePercent": 8.30,
  "cashOnCashReturnPercent": 9.57,
  "grossRentMultiplier": 8.33,
  "breakEvenRent": 1664.37,
  "debtServiceCoverageRatio": 1.30,
  "dealSignal": "Green",
  "dealSignalExplanation": "Positive cash flow and cap rate ≥ 5% — strong deal.",
  "firstTwelveMonths": [
    {
      "month": 1,
      "payment": 1064.48,
      "principal": 131.15,
      "interest": 933.33,
      "remainingBalance": 159868.85
    }
  ]
}
```

**Deal signal logic:**
- `Green` — cash flow > 0 **and** cap rate ≥ 5%
- `Yellow` — cash flow > 0 **or** cap rate ≥ 4%
- `Red` — everything else

---

### Banks

Seeded reference data (~34 banks). Used for autocomplete when creating accounts/cards/investments.

#### `GET /banks/search?q=`
Fuzzy search by bank name or alias.

**Query param:** `q` (string, min 2 chars)

**Response `200`:**
```json
[
  {
    "id": "guid",
    "name": "Chase",
    "logoUrl": "https://logo.clearbit.com/chase.com",
    "type": "Both"
  }
]
```

---

### Statements

PDF statement import and analysis.

#### `POST /statements/analyze`
Upload 1–10 credit card PDF statements (Chase, Amex). Returns a parsed analysis — no DB write.

**Request:** `multipart/form-data` with file(s) under key `files`.  
**Response `200`:** `StatementAnalysisResponseDto` (transactions, merchant totals, monthly breakdown, detected accounts).

---

#### `POST /statements/analyze-checking`
Upload 1–5 checking account PDFs (Chase, BofA, SoFi). Returns a parsed analysis — no DB write.

**Request:** `multipart/form-data` with file(s) under key `files`.  
**Response `200`:** `CheckingStatementResponseDto`

---

#### `POST /statements/save`
Saves a parsed credit card statement summary to history.

**Response `201`:** `StatementSummaryResponseDto`

---

#### `GET /statements/history`
Returns all saved credit card statement summaries.

---

#### `PUT /statements/{id}` / `DELETE /statements/{id}`
Update or soft-delete a saved summary.

---

#### `POST /statements/checking/save` / `GET /statements/checking/history`
Same pattern for checking statement summaries.

---

#### `PUT /statements/checking/{id}` / `DELETE /statements/checking/{id}`
Update or soft-delete a saved checking summary.

---

#### `GET /statements/annual-summary`
Returns a year-over-year financial summary across all saved statements.

---

### Health

#### `GET /health`
No auth required. Returns `{ "status": "healthy" }`. Used by Railway for uptime checks.

#### `GET /health/di`
No auth required. Returns a diagnostic list of registered DI services. Useful during local development to verify the DI container is wired correctly.

---

## 7. Frontend Integration Patterns

### Attaching the JWT automatically

The Axios client in `src/api/client.ts` uses a request interceptor so you never manually pass the token:

```ts
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token'); // or from AuthContext
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) window.location.href = '/login';
    return Promise.reject(err);
  }
);
```

---

### Invalidating net worth after any mutation

Net worth is computed live. After any mutation that affects it (adding an account, settling a pending item, etc.), invalidate both the networth and the changed resource:

```ts
queryClient.invalidateQueries({ queryKey: ['networth'] });
queryClient.invalidateQueries({ queryKey: ['accounts'] });
```

---

### TanStack Query stale times

```ts
useNetWorth()       // staleTime: 30s — recomputes often
useNetWorthHistory()// staleTime: 5m  — historical data changes rarely
useAccounts()       // staleTime: 60s
useBudgetCategories() // staleTime: Infinity — user rarely changes these
```

---

### Sending enum values

Always send enum values as strings (see [Section 5](#5-enum-serialization)):

```ts
// Good
await apiClient.post('/accounts', {
  accountType: 'Checking',  // string
  ...
});

// Bad
await apiClient.post('/accounts', {
  accountType: 0,  // integer — server will reject or misparse
  ...
});
```

---

### Calling the stateless property analyzer

The `/properties/analyze` endpoint is designed for real-time use (debounce on the frontend):

```ts
const analyze = useMutation({
  mutationFn: (req: PropertyAnalysisRequestDto) =>
    apiClient.post<PropertyAnalysisResponseDto>('/properties/analyze', req)
      .then(r => r.data),
  // No queryClient.invalidateQueries — stateless, no DB write
});
```

---

### Handling 404 vs 401

```ts
if (error.response?.status === 404) {
  // Resource doesn't exist OR belongs to another user
  // Show "not found" UI — never assume ownership error
}
if (error.response?.status === 401) {
  // Token expired or missing — redirect to login
  // The Axios interceptor handles this automatically
}
```

---

### Budget category percentage constraint

Before showing a "create category" form, fetch the current categories and compute the remaining budget:

```ts
const categories = useQuery({ queryKey: ['budgetCategories'], ... });
const usedPercent = categories.data?.reduce((s, c) => s + c.targetPercentage, 0) ?? 0;
const remaining = 1.0 - usedPercent; // e.g. 0.15 = 15% remaining
```

The server enforces the 100% cap and returns `400` if violated. The frontend check is just for UX — show the available percentage to the user before they submit.

---

### Spending transactions are immutable

There is no `PUT /spending/{id}`. To correct a transaction:

```ts
// 1. Delete the wrong one
await apiClient.delete(`/spending/${wrongId}`);
// 2. Create the correct one
await apiClient.post('/spending', correctedTransaction);
// 3. Invalidate
queryClient.invalidateQueries({ queryKey: ['spending'] });
queryClient.invalidateQueries({ queryKey: ['spendingAnalytics'] });
```

---

*Babylon Wealth API — v1.0 — Backend feature-complete*
