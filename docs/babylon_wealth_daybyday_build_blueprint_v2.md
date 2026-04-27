# ✦ BABYLON WEALTH ✦
## Full-Stack Personal Finance Application
### Project Blueprint & Build Plan
*A part of all you earn is yours to keep.*

| Frontend | Backend | Database | Auth |
|---|---|---|---|
| React + Vite | ASP.NET Core Web API | PostgreSQL | Identity + JWT |
| TypeScript | C# class libraries | EF Core Code-First | bcrypt passwords |
| Recharts + TanStack | xUnit + Moq tests | Migrations history | HTTP-only cookies |

---

## 1. Project Purpose & Vision

Babylon Wealth is a personal-use, full-stack financial tracking application inspired by *The Richest Man in Babylon* by George S. Clason. The central metaphor is Arkad's river: passive income and invested wealth that flows perpetually, versus the paycheck-to-paycheck "water bucket" that empties and must be refilled each month. The app makes this metaphor visual and actionable — tracking the growth of the user's river from a scorched desert (deep negative net worth) to a mighty, multi-channeled river (substantial invested wealth).

Every screen is designed to answer one question: **is your river growing?**

### Core Design Principles

- **Visual storytelling first** — the river animation and tier progression are the emotional core. Numbers matter, but the feeling of watching your river grow from a dry riverbed to a strong current is what drives engagement.
- **Arkad's 10% law is embedded everywhere** — income entry automatically computes savings targets, and the investing page tracks whether the river is actually producing passive flow.
- **Scalable by design** — every layer is interface-driven. Adding a new account type, a new income source category, or a new graph never breaks existing stored data.
- **Cloud-ready from day one** — PostgreSQL from the start, designed to deploy to Railway + Vercel with minimal config changes.
- **Personal and private** — no third-party bank integrations, no screen scraping. The user manually enters balance data and uploads their own PDF statements. The act of entering numbers forces awareness.

---

## 2. Application Pages & Feature Map

The app has **six pages**, accessible via a top or side navigation bar.

### Page 1 — Home (River)
The main screen. Current net worth displayed prominently at top. Below it, a dynamic animated scene renders based on the current net worth tier.

- **Tier progression:** Scorched (< −$50k) → Desert → Dry Bed → Stream → River → Strong River → Mighty River ($100k+)
- **River scene:** Animated SVG oval rings scale with tier; cracked earth SVG for negative tiers
- **Character emoji** (😭 → 🥳) bounces on screen matching the tier — emotional feedback
- **Net Worth chart:** AreaChart showing liquid NW and total NW over time. Custom crosshair scrub — hovering shows value at that point in time. Annotation flags on snapshots that have notes.
- **Annual summary callout:** Surfaced from checking/credit card statement history — "Your river grew $X last year"
- **Optimal River modal:** Educational slide-up showing passive income → lifestyle + reinvestment model. No API call.

### Page 2 — Accounting
Central manual-entry ledger for every financial position. All inputs are forms — no PDF upload here. Uses a **batch-save pattern**: all edits accumulate locally, flushed only when the user clicks "Save All Changes."

- **Bank Accounts** — bank logo, label, type (Checking/Savings), balance, linked budget category
- **Credit Cards** — bank logo, label, balance, limit, APR, card type (Personal/Business), utilization %
- **Loans** — label, lender, balance (shown negative), interest rate, loan type
- **Investments** — bank logo, label, current value, ticker, type (401k/Roth/Brokerage/Crypto)
- **Pending Items** — description, counterparty, amount (+/−), due date, status; Settle button
- **Properties** — address, purchase price, estimated value, loan balance, rent, expenses, equity; inline [Analyze] button
- **Income Sources** — name, type, annual amount; Arkad's 10% savings target computed from total
- **Net Worth summary bar** at top: Assets | Liabilities | Net Worth (from `useNetWorth()`)

### Page 3 — Money In
Upload checking account PDF statements to see where income comes from. Supports historical backfill — user selects the period before uploading. Saves monthly totals to build a history chart over time.

- **UploadFlowPanel:** Mode toggle (Monthly / Year-End) → strict dropdowns (month Jan–Dec, year 2020–2050) → PDF drop zone (Chase, SoFi, BofA auto-detected) → Start Analysis button
- **Analysis results:** Money In / Money Out / Net Flow KPI cards + donut chart breakdown
- **CumulativeTransactionView:** Clickable category pills filter the full transaction table. Month filter in Year-End mode. Export to PDF via browser print.
- **Save flow:** Monthly saves one record; Year-End groups transactions by month and loops saves. Upsert: if month already saved, confirms overwrite before calling PUT.
- **Monthly history chart:** AreaChart of Money In per month from saved records
- **Annual summary table:** Year / Money In / Months Recorded

### Page 4 — Money Out
Upload credit card PDF statements to see where money is going. Same UploadFlowPanel. Supports Chase monthly, Amex monthly, Chase year-end spending report, Amex year-end summary — all auto-detected.

- **Analysis results:** Total spend + period + report type badge
- **Spending breakdown:** Horizontal bar chart per category (Amazon, Shopping, Dining, Travel, etc.)
- **Top merchants table**
- **Year-End monthly bar chart** (one bar per month, Jan–Dec) — only shown for year-end reports
- **CumulativeTransactionView:** Category pills + optional month filter + PDF export
- **Save flow:** Monthly = one record; Year-End loops `monthlyBreakdown` saving each month. Upsert same as Money In.
- **Spend history chart:** AreaChart of TotalSpend per month from saved records
- **Annual summary table:** Year / Credit Card Spend / Money In / Net Savings

### Page 5 — Investing
Track all investment accounts, log compound growth projections, and see portfolio value over time. Manual input — no PDF.

- **Portfolio summary bar:** total value + per-account cards
- **Portfolio value over time chart:** AreaChart using net worth snapshot history, filtered to investment accounts
- **Monthly contributions table:** Each investment account with its contribution amount (stored client-side in localStorage for MVP)
- **Compound growth projector:** Monthly contribution + annual rate (%) + time horizon (years) → dual-line chart: total value vs contributions only. Purely frontend math, no API.
- **Passive income summary:** Last 12 months dividends/interest from Investment Income records

### Page 6 — Real Estate Analyzer
Stateless deal calculator + saved property portfolio.

- **Deal Calculator form:** purchase price, down payment ($/%linked), loan type (Conventional/FHA/VA/DSCR), interest rate, term, property tax, insurance, HOA, monthly rent, vacancy rate, maintenance reserve
- **Analysis results:** Monthly Cash Flow (large, color-coded), Cap Rate, Cash-on-Cash Return, GRM, Break-Even Rent, DSCR, deal signal badge (🟢/🟡/🔴), amortization table (first 12 months), info tooltips on every metric
- **Saved Properties grid:** Cards showing address, estimated value, equity, cash flow, deal signal. [Edit] pre-fills the calculator. Staleness warning if estimated value not updated in 90+ days.

---

## 3. Domain Model — Entities & Relationships

Every entity inherits `BaseEntity<Guid>`: `Id`, `CreatedAt`, `UpdatedAt`, `IsDeleted`, `DeletedAt`. Records are **never hard-deleted** — soft delete sets `IsDeleted = true`, protecting historical data. EF Core global query filters automatically exclude soft-deleted records from all queries.

### User
| Field | Description |
|---|---|
| Id (Guid) | Primary key |
| Email | Unique login identifier |
| PasswordHash | bcrypt hash — never store plain text |
| CreatedAt / UpdatedAt | Auto-managed by EF Core |
| IsDeleted | Soft delete flag |

> **Note:** Profile photo and Azure Blob Storage are **not** in scope for v1.0. User profile is name + email only.

### Bank (Seeded Reference Data — ~40 records)
| Field | Description |
|---|---|
| Name | Official bank name (e.g. JPMorgan Chase) |
| LogoUrl | Public CDN URL — served to frontend |
| Type | Enum: Personal \| Business \| Both |
| SearchAliases | Comma-separated nicknames for search |

### BankAccount
| Field | Description |
|---|---|
| UserId | FK to User |
| BankId | FK to Bank — populates logo and name |
| CustomLabel | User-defined name |
| Balance | Current balance (decimal) |
| AccountType | Enum: Checking \| Savings \| MoneyMarket |
| BudgetCategoryId | FK to BudgetCategory |

### CreditCard
| Field | Description |
|---|---|
| BankId | FK to Bank |
| CustomLabel | User-defined card name |
| Balance | Current balance owed (positive, treated as liability) |
| CreditLimit | Total credit limit |
| APR | Decimal — e.g. 0.27 = 27% |
| CardType | Enum: Personal \| Business |

### Loan
| Field | Description |
|---|---|
| CustomLabel | e.g. 'SoFi Personal Loan' |
| LenderName | Optional freeform lender name |
| Balance | Stored positive, displayed/computed as negative |
| InterestRate | Decimal — e.g. 0.115 = 11.5% |
| LoanType | Enum: Personal \| Student \| Auto \| HELOC \| Business \| Other |

### Investment
| Field | Description |
|---|---|
| BankId | FK to Bank (brokerage) |
| CustomLabel | e.g. 'TD Ameritrade Brokerage' |
| CurrentValue | Current market value |
| Ticker | Optional — e.g. MSFT, VTI |
| InvestmentType | Enum: Brokerage \| Retirement401k \| RothIRA \| Crypto \| Other |

### PendingItem
| Field | Description |
|---|---|
| Description | e.g. 'Uber reimbursement — Isaac' |
| Counterparty | Person or company (optional) |
| Amount | Positive = owed to user; Negative = user owes |
| DueDate | Optional target date |
| Status | Enum: Pending \| Settled — Settled items excluded from NW |
| SettledAt | Set when settled |

### IncomeSource
| Field | Description |
|---|---|
| Name | e.g. 'Microsoft Salary' |
| Type | Enum: Salary \| RSU \| Bonus \| Business \| Rental \| Other |
| AnnualAmount | Total annual figure |
| IsActive | Deactivate without deleting (job change) |

### BudgetCategory
| Field | Description |
|---|---|
| Name | e.g. 'Necessities', 'Investing' |
| TargetPercentage | All categories must sum to exactly 1.0 |
| Color | Hex string for chart rendering |
| DisplayOrder | Controls sort order in UI |

### SpendingTransaction
| Field | Description |
|---|---|
| AccountId | FK to BankAccount |
| CategoryId | FK to BudgetCategory |
| Amount | Decimal |
| Description | Merchant name or note |
| Date | Transaction date |

> Transactions are **immutable** — no PUT. Soft delete and re-enter if wrong (preserves audit trail).

### NetWorthSnapshot
| Field | Description |
|---|---|
| SnapshotDate | DateTime of capture |
| LiquidNetWorth | Assets minus liabilities, excluding properties |
| TotalNetWorth | Liquid NW + property equity |
| TotalAssets | Cash + investments total |
| TotalLiabilities | Cards + loans total |
| Annotation | User-added note — displays as flag on chart |

### Property
| Field | Description |
|---|---|
| Address | Property address string |
| PurchasePrice | Original price paid |
| CurrentEstimatedValue | User-updated periodically |
| LoanBalance | Remaining mortgage balance |
| MonthlyRent | Expected gross monthly rent |
| MonthlyExpenses | PITI + HOA + maintenance reserve |

### InvestmentIncome
| Field | Description |
|---|---|
| Source | e.g. 'Schwab Dividends' |
| Type | Enum: Dividend \| Interest \| BusinessDistribution \| Rental \| Other |
| Amount | Decimal |
| Date | Date received |

### StatementImport *(added in session)*
| Field | Description |
|---|---|
| UserId | FK to User |
| Month | 1–12 |
| Year | e.g. 2025 |
| TotalSpend | Decimal — sum of all credit card purchases |
| TransactionCount | Number of transactions parsed |
| AccountsIncluded | Comma-separated card last-4 digits |
| Notes | Optional freeform |

### CheckingStatementImport *(added in session)*
| Field | Description |
|---|---|
| UserId | FK to User |
| Month | 1–12 |
| Year | e.g. 2025 |
| TotalMoneyIn | Decimal — inflows excluding self-Zelle transfers |
| TotalMoneyOut | Decimal — outflows |
| TransactionCount | Number of transactions parsed |
| AccountsIncluded | Comma-separated account last-4 digits |
| Notes | Optional freeform |

---

## 4. Backend Architecture

### Dependency Direction
```
API → Services → Core ← Infrastructure
```
Infrastructure is **never** directly referenced by Services or Core. Services depend on repository interfaces only — fully mockable in tests.

### Project Responsibilities

| Project | Role |
|---|---|
| `BabylonWealth.Core` | Entities, interfaces, DTOs, enums, exceptions — zero EF/ASP.NET deps |
| `BabylonWealth.Infrastructure` | EF Core + PostgreSQL — DbContext, Configurations, Migrations, Repositories |
| `BabylonWealth.Services` | All business logic — depends on Core interfaces only |
| `BabylonWealth.API` | Thin controllers, middleware, background services — entry point only |
| `BabylonWealth.Tests` | xUnit + Moq unit tests |

### Architecture Rules (non-negotiable)
1. Controllers call **one service method** and return a DTO. Zero business logic in controllers.
2. Entities are **never serialized to JSON directly** — always map through a DTO.
3. Net worth is **never stored** — always computed live. Only `NetWorthSnapshot` records are stored.
4. **Soft deletes everywhere.** Never use `.Remove()`. EF Core global query filters exclude soft-deleted records.
5. **Enums stored as strings** via `[EnumMember(Value = "string")]`.
6. **Migrations are additive only.** Never remove or rename a column.
7. **`decimal`** for all money — never `double` or `float`.
8. Spending transactions are **immutable** — no PUT.

### PDF Parsers *(added in session)*

`StatementAnalyzerService` — credit card statements:
- Auto-detects: Chase monthly, Amex monthly, Chase year-end spending report, Amex year-end summary
- Returns `StatementAnalysisResponseDto` with full transaction list, category breakdown, top merchants, monthly breakdown (year-end only)

`CheckingStatementAnalyzerService` — checking account statements:
- Auto-detects by scanning first 40 lines: SoFi (`sofi.com`) → SoFi parser; Bank of America → BofA parser; default → Chase parser
- Self-transfer filter: Zelle Received transactions matching `\bDIEGO\b` are re-tagged as "Self Transfer" and excluded from `TotalMoneyIn`
- Returns `CheckingStatementResponseDto` with full transaction list, Money In / Money Out breakdowns

---

## 5. API Endpoint Reference

All routes under `/api/v1/`. All except `/auth/*` require `Authorization: Bearer <token>`.

### Auth
| Method | Route | Description |
|---|---|---|
| POST | /auth/register | Register — hashes password, returns JWT |
| POST | /auth/login | Authenticate — returns JWT + user profile |

### Net Worth
| Method | Route | Description |
|---|---|---|
| GET | /networth/current | Compute live net worth (liquid + total) |
| GET | /networth/history | Snapshot history for chart |
| POST | /networth/snapshot | Manually trigger a snapshot |
| POST | /networth/annotate | Add/edit annotation on a snapshot |
| GET | /networth/annotations?from=&to= | Annotations in date range |

### Accounts / Cards / Loans / Investments
| Method | Route | Description |
|---|---|---|
| GET/POST | /accounts | List or create bank accounts |
| PUT/DELETE | /accounts/{id} | Update or soft-delete |
| GET/POST | /creditcards | List or create credit cards |
| PUT | /creditcards/{id} | Update balance, limit, APR |
| GET/POST | /loans | List or create loans |
| PUT | /loans/{id} | Update loan balance |
| GET/POST | /investments | List or create investments |
| PUT | /investments/{id} | Update current value |
| GET/POST | /pending | List or create pending items |
| PATCH | /pending/{id}/settle | Mark pending item settled |

### Income / Budget / Spending
| Method | Route | Description |
|---|---|---|
| GET/POST | /income | List or create income sources |
| PUT | /income/{id} | Update income amount |
| GET/POST | /investmentincome | List or record passive income |
| GET | /investmentincome/summary | Monthly passive income trend |
| GET/POST | /budget/categories | List or create budget categories |
| PUT | /budget/categories/{id} | Update name/percentage |
| GET/POST | /spending | Spending transactions (filterable by month) |
| GET | /spending/analytics?month=&year= | Monthly breakdown vs budget targets |

### Properties
| Method | Route | Description |
|---|---|---|
| GET/POST | /properties | List or save a property |
| PUT/DELETE | /properties/{id} | Update value / soft-delete |
| POST | /properties/analyze | Stateless deal analysis — no DB write |

### Statement Analysis *(added in session)*
| Method | Route | Description |
|---|---|---|
| POST | /statements/analyze | Stateless — credit card PDFs → pooled analysis |
| POST | /statements/save | Save monthly credit card total to DB |
| PUT | /statements/{id} | Update an existing monthly credit card record |
| GET | /statements/history | All saved monthly credit card totals |
| DELETE | /statements/{id} | Soft-delete a saved monthly record |
| POST | /statements/analyze-checking | Stateless — checking PDFs → pooled analysis |
| POST | /statements/checking/save | Save monthly checking total to DB |
| PUT | /statements/checking/{id} | Update an existing monthly checking record |
| GET | /statements/checking/history | All saved monthly checking totals |
| DELETE | /statements/checking/{id} | Soft-delete a saved checking record |
| GET | /statements/annual-summary | Per-year totals combining checking + credit card history |

### Users / Banks
| Method | Route | Description |
|---|---|---|
| GET | /users/me | Current user profile |
| PUT | /users/me | Update display name |
| GET | /banks/search?q= | Search bank library — returns name + logo URL |
| GET | /health | Health check |

> **Removed from v1.0:** `POST /upload/profile` (Azure Blob profile photo). No blob storage dependency.

---

## 6. Frontend Architecture

React + Vite + TypeScript. API calls via Axios with a central client that attaches JWT automatically. TanStack Query for all server state.

### Project Structure
| Folder | Purpose |
|---|---|
| `src/api/` | Axios client + per-domain API functions |
| `src/components/` | Reusable UI: Button, Modal, RiverScene, UploadFlowPanel, CumulativeTransactionView, etc. |
| `src/pages/` | One folder per page: River/, Accounting/, MoneyIn/, MoneyOut/, Investing/, RealEstate/ |
| `src/hooks/` | TanStack Query wrappers — useNetWorth, useAccounts, useCheckingHistory, etc. |
| `src/context/` | AuthContext — JWT + user profile |
| `src/utils/` | Currency formatting, tier logic, compound growth math, property math |
| `src/types/` | TypeScript interfaces mirroring API DTOs exactly |
| `src/styles/` | CSS variables (Babylon gold/dark theme tokens) |
| `src/constants/` | TIERS array, INCOME_TYPES, MONTH_NAMES, YEAR_OPTIONS |

### Design Tokens
```css
--color-bg:          #0D0D0D;   /* Near-black background */
--color-gold:        #C9A84C;   /* Primary accent — Arkad's gold */
--color-gold-hover:  #E2BB6B;
--color-river:       #1B7A6E;   /* River teal */
--color-text:        #F0EAD6;   /* Warm off-white */
--color-text-muted:  #8A8070;
--color-positive:    #4CAF7D;   /* Asset / Money In */
--color-negative:    #E05555;   /* Liability / Money Out */
--color-projection:  #6B8CFF;   /* Compound growth line */
```

### Key Data Hooks
```ts
// Net Worth + Snapshots
useNetWorth()              // GET /networth/current — staleTime 30s
useNetWorthHistory()       // GET /networth/history + annotations
useAnnualSummary()         // GET /statements/annual-summary

// Accounting page
useAccounts()              // GET /accounts
useCreditCards()           // GET /creditcards
useLoans()                 // GET /loans
useInvestments()           // GET /investments
usePendingItems()          // GET /pending
useProperties()            // GET /properties
useIncome()                // GET /income
useBudgetCategories()      // GET /budget/categories

// Money In page
useCheckingHistory()       // GET /statements/checking/history
useAnalyzeChecking()       // POST mutation
useSaveChecking()          // POST mutation
useUpdateChecking()        // PUT mutation

// Money Out page
useStatementHistory()      // GET /statements/history
useAnalyzeStatement()      // POST mutation
useSaveStatement()         // POST mutation
useUpdateStatement()       // PUT mutation

// Investing page
usePassiveIncome()         // GET /investmentincome/summary
```

### Shared Components

**`UploadFlowPanel`** — used on Money In and Money Out pages:
- Mode toggle: Monthly | Year-End
- Period pickers: month `<select>` (Jan–Dec) + year `<select>` (2020–2050) — strict dropdowns, no free text
- PDF drop zone — drag-and-drop + browse, any number of files
- Start Analysis button (disabled until files selected)
- Zero-transaction guard: if `result.transactionCount === 0`, blocks save and shows error
- Inferred-date mismatch warning if PDF date differs from user selection

**`CumulativeTransactionView`** — used on both analysis result panels:
- Category pill filters (sorted by total desc) — click to drill in, click again to reset to All
- Month filter row (Year-End mode only)
- Sortable transaction table (Date / Description / Amount / Account)
- Export to PDF via `window.print()` + `@media print` CSS — no npm dependency
- Print output respects active filter state

**Batch Save pattern** (Accounting + Investing tabs):
- Edits accumulate in a `Map<id, changes>` dirty state — no API call on keystroke
- "N unsaved changes" badge appears when map is non-empty
- "Save All Changes" flushes the map with `Promise.all(PUT calls)`
- "Discard" resets the map

---

## 7. Snapshot Background Service

`SnapshotBackgroundService` runs every 6 hours. On each tick:
1. Is today Sunday?
2. Has it been 14+ days since the last snapshot?
3. If both true → `SnapshotService.TakeSnapshotAsync(userId)` → writes `NetWorthSnapshot`

Requires Railway Hobby plan (~$5/mo) for 24/7 uptime. The service is idempotent — safe to call multiple times.

---

## 8. Real Estate Deal Metrics

All computed server-side by `PropertyAnalyzerService`:

| Metric | Formula |
|---|---|
| Monthly Cash Flow | Gross Rent − PITI − HOA − Maintenance − Vacancy |
| Cap Rate | (Annual NOI / Purchase Price) × 100 |
| Cash-on-Cash Return | (Annual Cash Flow / Total Cash Invested) × 100 |
| GRM | Purchase Price / Annual Gross Rent |
| Break-Even Rent | Monthly fixed costs / (1 − vacancy rate) |
| DSCR | NOI / Annual Debt Service |
| Mortgage (P&I) | M = P[r(1+r)^n] / [(1+r)^n − 1] |

**Deal signal:**
- 🟢 Green: `CashFlow > 0 AND CapRate >= 5%`
- 🟡 Yellow: `CashFlow > 0 OR CapRate >= 4%`
- 🔴 Red: everything else

---

## 9. Day-by-Day Build Plan

> **Current position: starting Day 22.** Days 1–21 are complete. ✅ marks fully done work.

---

### ✅ COMPLETED — Days 1–21

**Week 1 (Days 1–7): Solution Scaffold, Entities, EF Core, Auth**
- Day 1: Solution + project structure + Git ✅
- Day 2: BaseEntity + all Core entities ✅
- Day 3: Repository + service interfaces ✅
- Day 4: EF Core DbContext + PostgreSQL + first migration ✅
- Day 5: ASP.NET Core Identity + JWT auth ✅
- Day 6: All repository implementations + DI registration ✅
- Day 7: BankSeeder (~40 banks) + first Swagger test ✅

**Week 2 (Days 8–14): Core CRUD + Net Worth**
- Day 8: AccountsController + service + CRUD ✅
- Day 9: CreditCardsController ✅
- Day 10: LoansController ✅
- Day 11: InvestmentsController + PendingItemsController ✅
- Day 12: NetWorthService — live computation ✅
- Day 13: SnapshotService + biweekly BackgroundService ✅
- Day 14: NetWorthAnnotationsController ✅

**Week 3 (Days 15–21): Income, Budget, Spending + Tests**
- Day 15: IncomeController + IncomeService ✅
- Day 16: BudgetCategoriesController (100% invariant enforced) ✅
- Day 17: SpendingController + immutable transactions ✅
- Day 18: BudgetAnalyticsService ✅
- Day 19: InvestmentIncomeController ✅
- Day 20: MonthlyBudgetSnapshot job + unit tests ✅
- Day 21: Unit tests — NetWorthService + PropertyAnalyzerService stub ✅

**Additional work completed ahead of schedule (done in build sessions):**
- PDF statement analyzer — credit cards (Chase monthly, Amex monthly, Chase/Amex year-end) ✅
- PDF statement analyzer — checking accounts (Chase, SoFi, BofA auto-detected) ✅
- Self-Zelle filter (`\bDIEGO\b`) excludes inter-account transfers from Money In ✅
- StatementImport + CheckingStatementImport entities + EF Core configurations ✅
- Migrations: `AddStatementImports`, `AddCheckingStatementImports` (both applied) ✅
- StatementImportService + CheckingStatementImportService with upsert + validation ✅
- PUT endpoints for both statement types ✅
- AnnualSummary endpoint combining checking + credit card yearly data ✅
- 98 unit tests passing (including 18 checking parser tests) ✅

---

### Week 4 (Days 22–28) — Real Estate Analyzer Backend
*Goal: PropertyAnalyzerService complete. Properties save/retrieve. Full Swagger coverage.*

#### Day 22 — PropertyAnalyzerService: Mortgage Math ← **YOU ARE HERE**
**Build:**
Implement the mortgage payment formula: `M = P[r(1+r)^n] / [(1+r)^n − 1]`. Handle all four loan types: Conventional (LTV determines PMI threshold), FHA (MIP: 0.55% annual), VA (0% down, no PMI), DSCR (income-based underwriting). Return first 12 months of amortization (principal, interest, balance per month). Test every loan type against a known online mortgage calculator.

**Key code:**
```csharp
public decimal CalculateMonthlyPayment(decimal principal, decimal annualRate, int termYears)
{
    var r = annualRate / 12;
    var n = termYears * 12;
    if (r == 0) return principal / n;
    var factor = (decimal)Math.Pow((double)(1 + r), n);
    return principal * r * factor / (factor - 1);
}
```

**Patterns:** Financial formula in C#, decimal precision for amortization, loan type polymorphism via enum switch
**Takeaway:** Financial math must be exact. Verify every formula against a trusted external calculator before writing tests.

---

#### Day 23 — PropertyAnalyzerService: Cash Flow + Deal Metrics + Tests
**Build:**
Implement all output metrics: Monthly Cash Flow, Annual Cash Flow, Cap Rate, Cash-on-Cash Return, GRM, Break-Even Rent, DSCR. Implement deal signal logic (Green/Yellow/Red) as a service-layer business rule, not UI logic. Write 12+ unit tests covering: positive cash flow deals, negative cash flow deals, boundary cap rate (exactly 5%), zero rent input, high vacancy rate scenario, DSCR below 1.0.

**Patterns:** Multi-metric aggregation, deal signal as pure function (takes numbers, returns enum), boundary condition testing
**Takeaway:** Deal signals are business rules — the service returns `Green/Yellow/Red`. The UI just renders the color. Never put this logic in a React component.

---

#### Day 24 — PropertiesController: Save + Retrieve + Full CRUD
**Build:**
Create `PropertiesController`. `POST /properties/analyze`: stateless — takes `PropertyAnalysisRequest`, returns full analysis DTO, **no DB write**. `POST /properties`: saves the property record (address, prices, loan, rent, expenses) then re-runs the analysis and returns both in the response. `GET /properties`, `PUT /properties/{id}` (update estimated value, loan balance, rent), `DELETE /properties/{id}` (soft delete). Test all five endpoints in Swagger with a real JWT.

**Patterns:** Stateless calculation endpoint vs persisting endpoint — the `/analyze` route is reusable without side effects
**Takeaway:** The stateless `/analyze` endpoint is valuable for the Real Estate page's "run numbers without saving" mode. Keep it separate from the save path.

---

#### Day 25 — Dual Net Worth: Liquid vs Total with Properties
**Build:**
Update `NetWorthService.ComputeAsync` to return both `LiquidNetWorth` (cash + investments − all debts, **no property**) and `TotalNetWorth` (liquid + property equity). Property equity = `CurrentEstimatedValue − LoanBalance`. Update `SnapshotService` to record both values. Update `NetWorthResponseDto` to include `HasProperties` flag so the frontend knows whether to render the second chart line. Test with a saved property in the DB.

**Patterns:** Additive DTO fields (non-breaking change), conditional inclusion of property equity
**Takeaway:** Adding fields to a response DTO is non-breaking — existing callers that don't read the new field are unaffected.

---

#### Day 26 — Users/Me + Swagger Polish + Backend Audit
**Build:**
Create `UsersController` with `GET /users/me` and `PUT /users/me` (update display name). Verify `GET /health` endpoint exists. Review **all** endpoints in Swagger: confirm every auth-required endpoint returns 401 without token, confirm all soft-deleted records are excluded from GET responses, confirm error responses all return consistent `{ "error": "..." }` JSON shape. Add XML doc comments to all controller methods (Swagger `<summary>` tags). Fix any issues found.

> No Azure Blob Storage, no profile photo upload — **this is intentionally removed from v1.0.**

**Takeaway:** A well-documented Swagger makes frontend development dramatically faster. Every endpoint should have a `<summary>` and clear parameter descriptions.

---

#### Day 27 — Integration Test Day + Buffer
**Build:**
Write integration tests for `PropertiesController`: POST /analyze with a known set of inputs, verify cap rate, cash flow, and deal signal match expected values. Write integration test for the full auth flow (register → login → call authenticated endpoint). Run `dotnet test` — all tests must pass. Use this day to fix any backend issues discovered during audit.

**Takeaway:** Integration tests catch issues that unit tests miss — like a middleware bug that returns 500 instead of 401.

---

#### Day 28 — Git Commit + Backend Complete Checkpoint
**Build:**
Final backend review. Verify `dotnet build` with 0 warnings, 0 errors. Run `dotnet test` — all green. Git commit: `Backend complete — all endpoints, analyzers, tests passing`. At this point the backend is **feature-complete for v1.0** and the frontend build begins.

---

### Week 5 (Days 29–35) — React Setup + Home (River) Tab
*Goal: React app running, JWT auth works end-to-end, River tab fully functional with real API data.*

#### Day 29 — React + Vite + TypeScript Setup
**Build:**
```bash
npm create vite@latest babylon-wealth-client -- --template react-ts
cd babylon-wealth-client
npm install axios react-router-dom @tanstack/react-query recharts framer-motion date-fns @tanstack/react-table
```
Create `src/api/client.ts`: Axios instance with `baseURL` from `import.meta.env.VITE_API_BASE_URL`, request interceptor adds `Authorization: Bearer <token>` from localStorage, response interceptor catches 401 and redirects to `/login`. Create `AuthContext.tsx`. Set up React Router v6 with public routes (`/login`, `/register`) and a `<ProtectedRoute>` wrapper for all others. Create `.env.development` with `VITE_API_BASE_URL=http://localhost:5231/api/v1`.

**Takeaway:** The Axios interceptor is the auth gateway — one place, one rule. Every API call automatically gets the JWT attached.

---

#### Day 30 — Login + Register Pages
**Build:**
Create `/login` with email/password form, calls `POST /auth/login`, stores JWT in AuthContext + localStorage, redirects to `/`. Create `/register`. Apply Babylon gold/dark theme CSS variables globally. Client-side validation: password min 8 chars. Error states: inline field messages.

---

#### Day 31 — API Hooks Setup + useNetWorth
**Build:**
Create `src/hooks/useNetWorth.ts` (TanStack Query, `staleTime: 30_000`). Create `src/hooks/useNetWorthHistory.ts`. Create `src/hooks/useAnnualSummary.ts`. Create `src/types/netWorth.ts` with TypeScript interfaces matching API DTOs **exactly**. Test that a real API call returns and displays data.

---

#### Day 32 — River Tab: Net Worth Display + Tier System
**Build:**
Implement `src/constants/tiers.ts` — TIERS array covering Scorched (< −$50k) through Mighty River ($100k+). Write `getTier(nw: number)` and `getTierProgress(nw: number): number` (0–1 progress to next tier). Build `<NetWorthPanel>`: display net worth from `useNetWorth()`, `<NetWorthToggle>` (Liquid | Total pill), tier label, Framer Motion character emoji bounce, milestone progress bar, Arkad's tier-specific advice.

---

#### Day 33 — River Scene Animations
**Build:**
Build `<DesertScene>` — cracked earth SVG for Scorched/Desert tiers. Build `<AerialRiverScene>` — nested SVG ellipses (ovals), count scales with tier's `riverRings` value (1–5), each ring breathes with a CSS `scale` keyframe loop (~4s). Add shimmer overlay on inner ring. Framer Motion `layoutId` for smooth tier transitions.

---

#### Day 34 — Net Worth Chart + Annotation Flags
**Build:**
Build `<NetWorthHistoryChart>` using Recharts `AreaChart`. Two series: `LiquidNetWorth` (gold) and `TotalNetWorth` (blue-teal — only rendered if `hasProperties`). Custom dot: snapshots with annotations render a small flag icon. Implement chart scrub: `onMouseMove` sets `scrubbedValue`, `onMouseLeave` resets. "Add Note" modal calls `POST /networth/annotate` and invalidates the history query.

---

#### Day 35 — Annual Summary Callout + Optimal River Modal + Week 5 Polish
**Build:**
Pull `useAnnualSummary()` — surface last year's net savings as a callout below the chart: *"Your river grew $X last year."* Build `<OptimalRiverModal>` — slide-up educational diagram, no API call. Review the River tab on mobile. Git commit: *"Week 5 complete — River tab functional."*

---

### Week 6 (Days 36–42) — Accounting Tab
*Goal: All account types with batch-save, bank logo autocomplete, net worth summary bar.*

#### Day 36 — TanStack Table Base + Bank Search Autocomplete
**Build:**
Create `<LedgerTable>` base component using TanStack Table: sortable columns, color-coded rows (green assets / red liabilities), sticky header, bold totals row. Create `<BankSearchInput>`: text input calling `GET /banks/search?q=` debounced 300ms, dropdown shows bank name + logo.

---

#### Day 37 — Bank Accounts + Credit Cards Sections
**Build:**
Bank Accounts section: bank logo, label, type, balance, budget category, edit/delete. Credit Cards section (Personal/Business toggle): bank logo, label, balance, limit, APR, utilization %. Both sections use the **batch-save dirty map** pattern — edits accumulate locally.

---

#### Day 38 — Loans + Investments Sections
**Build:**
Loans: label, type, balance (rendered negative), interest rate. Investments: bank logo, label, type, current value, ticker. Verify that updating an investment balance on the Accounting tab automatically updates the River tab's net worth via shared TanStack Query cache.

---

#### Day 39 — Pending Items + Properties Section
**Build:**
Pending Items: description, counterparty, amount, due date, status, Settle button (calls `PATCH /pending/{id}/settle`). Properties: display as cards with address, estimated value, equity, cash flow, deal signal badge, [Edit] and [Analyze] buttons. [Analyze] opens the Real Estate page pre-filled with that property's numbers.

---

#### Day 40 — Income Sources + Arkad's 10% Panel
**Build:**
Income Sources: list with type, annual amount, monthly equivalent, active toggle. Arkad's Law panel: "To follow the First Cure, save X per month — one coin of every ten." Compute savings target from total annual income.

---

#### Day 41 — Budget Categories + Spending Transactions
**Build:**
Budget categories manager: edit percentage (validates total stays at 100%), custom color, reorder. Spending transaction entry: account selector, category selector, amount, description, date. Monthly transaction list. Wire to `GET /spending?month=&year=`.

---

#### Day 42 — Batch Save + Summary Bar + Week 6 Polish
**Build:**
Wire up the batch-save "Save All Changes" / "Discard" buttons for all editable sections. Net Worth summary bar at top of Accounting tab. Mobile layout review. Git commit: *"Week 6 complete — Accounting tab."*

---

### Week 7 (Days 43–49) — Money In + Money Out Pages
*Goal: Both PDF import pages fully functional with history charts, upsert flow, and cumulative transaction view.*

#### Day 43 — UploadFlowPanel Component + Statement API Hooks
**Build:**
Build `<UploadFlowPanel>` (see component spec in `docs/app-architecture-and-pages-spec.md §5.2`). Create all statement hooks: `useAnalyzeChecking`, `useSaveChecking`, `useUpdateChecking`, `useCheckingHistory`, `useAnalyzeStatement`, `useSaveStatement`, `useUpdateStatement`, `useStatementHistory`. Wire up Axios multipart/form-data post.

---

#### Day 44 — Money Out Page: Upload + Analysis Results
**Build:**
Build `<MoneyOutPage>` skeleton. Wire `<UploadFlowPanel mode="credit">` to call `POST /statements/analyze`. Render `<SpendSummaryCard>`, `<CategoryBarChart>` (Recharts horizontal BarChart), `<TopMerchantsTable>`. Show `<MonthlyBreakdownBarChart>` when `reportType === "YearEnd"`.

---

#### Day 45 — Money Out: CumulativeTransactionView + PDF Export
**Build:**
Build `<CumulativeTransactionView>` (see `docs/app-architecture-and-pages-spec.md §5.1`). Wire category pills, sortable table, month filter (year-end mode). Implement `handleExport`: `document.body.classList.add('printing-transactions')` → `window.print()`. Create `src/styles/print.css` with `@media print` rules. Test export to PDF in browser.

---

#### Day 46 — Money Out: History Chart + Save Flow + Upsert
**Build:**
Build `<SpendHistoryAreaChart>` (Recharts AreaChart, red/amber, from `useStatementHistory()`). Implement `<SavePeriodButton>` with dynamic label ("Save …" vs "Update …"). Implement upsert check against `history?.find(r => r.month === period.month && r.year === period.year)`. Monthly save = single `POST`. Year-end save = loop through `monthlyBreakdown` with progress indicator. Wire `<AnnualSummaryTable>` from `useAnnualSummary()`.

---

#### Day 47 — Money In Page: Upload + Analysis Results
**Build:**
Build `<MoneyInPage>`. Wire `<UploadFlowPanel mode="checking">`. Render `<MoneyFlowSummaryCards>` (In / Out / Net Flow KPIs), `<MoneyInDonutChart>` (Recharts PieChart). Wire `<CumulativeTransactionView>` with `moneyInBreakdown` and direction column (+/−).

---

#### Day 48 — Money In: History Chart + Year-End Batch Save
**Build:**
Build `<MoneyInAreaChart>` (green, from `useCheckingHistory()`). Implement year-end checking batch save: group `result.transactions` by `t.date.slice(0,7)`, sum per month, loop saves. Wire `<AnnualSummaryTable>`. Inferred-date mismatch yellow banner.

---

#### Day 49 — Both Pages Polish + Week 7 Git Commit
**Build:**
Empty state designs ("No statements saved yet — upload a PDF to start tracking"). Loading skeletons. Error banners. Parse-error block message (zero transactions = no save button). Mobile viewport test. Git commit: *"Week 7 complete — Money In + Money Out pages."*

---

### Week 8 (Days 50–56) — Investing + Real Estate + Deployment
*Goal: All six pages complete. App deployed to Railway + Vercel. v1.0 tagged.*

#### Day 50 — Investing Page: Portfolio + Compound Growth Projector
**Build:**
Build `<InvestingPage>`. `<PortfolioSummaryBar>`: total value + per-account cards from `useInvestments()`. `<PortfolioValueChart>`: AreaChart using `useNetWorthHistory()` filtered to sum of investment values. `<MonthlyContributionsTable>`: contributions stored in `localStorage` (MVP). `<CompoundGrowthProjector>`: monthly total, annual rate %, years inputs → dual-line chart (total vs contributions only). Implement:
```ts
function projectGrowth(monthly: number, annualRate: number, years: number) {
  const r = annualRate / 100 / 12;
  let value = 0, contributed = 0;
  const data = [];
  for (let m = 0; m <= years * 12; m++) {
    value = value * (1 + r) + monthly;
    contributed += monthly;
    if (m % 12 === 0) data.push({ year: m/12, totalValue: Math.round(value), contributed: Math.round(contributed) });
  }
  return data;
}
```
`<PassiveIncomeSummary>` from `usePassiveIncome()`. Batch-save pattern for investment value edits.

---

#### Day 51 — Real Estate Analyzer: Form + Live Calculation
**Build:**
Build `<RealEstatePage>`. `<DealCalculatorForm>`: purchase price, down payment ($↔% linked inputs), loan type selector with expandable descriptions (FHA/Conventional/VA/DSCR), interest rate, term, property tax, insurance, HOA, monthly rent, vacancy %, maintenance. Call `POST /properties/analyze` debounced 500ms on any input change. `<LoanSummaryPanel>`: monthly P&I, estimated total interest, cash to close.

---

#### Day 52 — Real Estate: Metrics + Deal Signal + Saved Properties
**Build:**
`<DealResultsPanel>`: Monthly Cash Flow (large, color-coded green/red), Cap Rate, Cash-on-Cash Return, GRM, Break-Even Rent, DSCR. `<DealSignalBadge>` (🟢/🟡/🔴 + plain-English explanation). Amortization table (first 12 months). Info tooltips (?) on every metric. `<SavedPropertiesGrid>`: cards from `useProperties()`, [Edit] pre-fills calculator, [Delete] soft-delete. Staleness warning if `LastValueUpdateDate` > 90 days.

---

#### Day 53 — Complete xUnit Test Suite
**Build:**
Write any remaining unit tests. Target totals:
- `NetWorthService` — 8 tests ✅ (already done)
- `StatementAnalyzerService` — 10 tests ✅ (already done)
- `CheckingStatementAnalyzerService` — 18 tests ✅ (already done)
- `BudgetAnalyticsService` — 6 tests
- `PropertyAnalyzerService` — 12 tests
- `SnapshotService` — 3 tests

Run `dotnet test` — all must pass. Fix any failures before proceeding to deployment.

---

#### Day 54 — Railway Deployment: API + PostgreSQL
**Build:**
Add `Dockerfile` to solution root (multi-stage .NET build). Create Railway project, attach managed PostgreSQL service. Set environment variables:
```
JWT__SecretKey=<generate 32+ char secret>
ASPNETCORE_URLS=http://+:8080
ASPNETCORE_ENVIRONMENT=Production
FRONTEND_URL=https://your-app.vercel.app
```
Add auto-migrate to `Program.cs` before `app.Run()`:
```csharp
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BabylonDbContext>();
    db.Database.Migrate();
}
```
Push to `main` — Railway builds and deploys. Verify Swagger at Railway URL. Verify bank seeder ran (GET /banks/search?q=chase returns results).

**Takeaway:** `db.Database.Migrate()` is idempotent — safe on every startup. EF Core skips already-applied migrations.

---

#### Day 55 — Vercel Deployment: React Frontend
**Build:**
Connect GitHub repo to Vercel. Set Root Directory to `babylon-wealth-client`. Add environment variable:
```
VITE_API_BASE_URL=https://your-api.railway.app/api/v1
```
Add `vercel.json` to the client folder:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```
Update `FRONTEND_URL` on Railway to the Vercel URL. Run full end-to-end test: register → add account → upload a statement PDF → check River tab net worth.

**Takeaway:** The CORS `FRONTEND_URL` update is the most commonly missed step. Railway must know the Vercel URL before the frontend can talk to the API.

---

#### Day 56 — README + Final Review + v1.0 Tag
**Build:**
Write `README.md`:
- Prerequisites (Node 20+, .NET 8, PostgreSQL 15+)
- Running locally (two terminals: `dotnet run` + `npm run dev`)
- First-time setup (migrations, env files)
- How snapshots work
- How to run tests (`dotnet test`)
- How to upload statement PDFs

Final visual review — screenshot each of the 6 pages. Git commit: *"v1.0 — Babylon Wealth complete."* Tag:
```bash
git tag v1.0.0 && git push --tags
```

---

## 10. Database — PostgreSQL

### Applied Migrations
```
InitialCreate                          (all base entities)
AddStatementImports                    (StatementImports table)
AddCheckingStatementImports            (CheckingStatementImports table)
```
Any future migrations: `dotnet ef migrations add <Name> --project BabylonWealth.Infrastructure --startup-project BabylonWealth.API`

### Local Development Setup
```bash
# Create DB
createdb babylonwealth

# appsettings.Development.json
"DefaultConnection": "Host=localhost;Database=babylonwealth;Username=postgres;Password=yourpassword"

# Apply migrations
dotnet ef database update --project BabylonWealth.Infrastructure --startup-project BabylonWealth.API

# Bank seeder runs automatically on first startup
```

### React env
```
# babylon-wealth-client/.env.development
VITE_API_BASE_URL=http://localhost:5231/api/v1
```

---

## 11. Deployment

| Option | Cost | Notes |
|---|---|---|
| **Railway + Vercel (recommended)** | ~$5/mo | Railway: API + PostgreSQL. Vercel: React (free CDN). Snapshots run 24/7. |
| Fly.io + Vercel | ~$3/mo | Generous free tier. Native Docker support. |
| Render | Free/$7mo DB | API sleeps on free tier — use paid for snapshots. |
| Azure | ~$15–25/mo | App Service + Azure PostgreSQL. Production-grade but overkill for personal use. |

See `docs/babylon_railway_deployment.md` for full step-by-step Railway deployment guide.

---

## 12. What Was Removed from v1.0

The following features from the original plan are intentionally **out of scope** for v1.0 and removed from the build plan:

| Feature | Reason |
|---|---|
| Profile photo upload | Requires Azure Blob Storage — adds infrastructure complexity, no meaningful value for personal use |
| Azure Blob Storage / Azurite | Removed with profile photo |
| Old 7-tab layout (Ledger/Income/Spending/Investment Income/Wisdom) | Replaced by cleaner 6-page architecture. All data entry consolidated into Accounting tab. |
| Wisdom tab (static content) | Removed — content is available in the book. Keeps the nav clean. |
| CustomFields jsonb column | Not needed for v1.0 entities — add when a concrete use case appears |

---

*✦ Babylon Wealth — Personal Finance, Built with Intention ✦*

*To export this document as PDF: open in VS Code with a Markdown Preview extension (e.g. "Markdown PDF" by yzane), or open the preview in a browser and use File → Print → Save as PDF.*
