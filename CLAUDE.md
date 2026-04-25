# ✦ BABYLON WEALTH — Claude Code Reference

> *A part of all you earn is yours to keep.*
>
> Personal finance tracker inspired by *The Richest Man in Babylon*. Central metaphor: Arkad's river (passive income / invested wealth) vs. the paycheck bucket (fully spent). Every screen answers one question: **is your river growing?**

---

## Quick Navigation

- [Tech Stack](#tech-stack)
- [Solution Structure](#solution-structure)
- [Running Locally](#running-locally)
- [Architecture Rules](#architecture-rules)
- [Domain Model Summary](#domain-model-summary)
- [API Routes](#api-routes)
- [Frontend Structure](#frontend-structure)
- [Key Conventions](#key-conventions)
- [Design System](#design-system)
- [Tier System](#tier-system)
- [Docs](#docs)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| State / Data | TanStack Query + Axios |
| Charts | Recharts |
| Tables | TanStack Table |
| Animations | Framer Motion |
| Backend | ASP.NET Core Web API (C#) |
| ORM | EF Core Code-First (Npgsql) |
| Database | PostgreSQL |
| Auth | ASP.NET Core Identity + JWT (HTTP-only cookies) |
| Testing | xUnit + Moq |
| Deployment | Railway (API + DB) + Vercel (React) |

---

## Solution Structure

```
BabylonWealth.sln
├── BabylonWealth.API/             # ASP.NET Core entry point — thin controllers only
│   ├── Controllers/               # One controller per domain, routes under /api/v1/
│   ├── Middleware/                # JwtMiddleware, ErrorHandlingMiddleware
│   └── BackgroundServices/        # SnapshotBackgroundService (biweekly auto-snapshot)
│
├── BabylonWealth.Core/            # No EF/ASP.NET dependencies — pure domain
│   ├── Entities/                  # All domain entities extending BaseEntity<Guid>
│   ├── Interfaces/
│   │   ├── Repositories/          # IBaseRepository<T,TKey> + entity-specific interfaces
│   │   └── Services/              # INetWorthService, IBudgetAnalyticsService, etc.
│   ├── DTOs/
│   │   ├── Requests/
│   │   └── Responses/
│   ├── Enums/                     # [EnumMember] string-valued enums
│   └── Exceptions/                # NotFoundException, ValidationException, etc.
│
├── BabylonWealth.Infrastructure/  # EF Core + PostgreSQL — referenced only via DI
│   ├── Persistence/
│   │   ├── BabylonDbContext.cs    # Global soft-delete query filters applied here
│   │   ├── Configurations/        # IEntityTypeConfiguration<T> per entity
│   │   └── Migrations/
│   ├── Repositories/              # Concrete EF Core implementations
│   ├── Seeders/                   # BankSeeder — runs on startup if Banks table empty
│   └── Extensions/                # InfrastructureExtensions.cs — all DI registrations
│
├── BabylonWealth.Services/        # Business logic — depends on Core interfaces only
│   ├── NetWorthService
│   ├── BudgetAnalyticsService
│   ├── PropertyAnalyzerService
│   ├── PassiveIncomeService
│   └── SnapshotService
│
├── BabylonWealth.Tests/           # xUnit — Services/ + Helpers/MockFactory.cs
│
└── babylon-wealth-client/         # React + Vite frontend
    └── src/
        ├── api/                   # Axios client + per-domain API functions
        ├── components/            # Reusable UI (Button, Modal, RiverScene, etc.)
        ├── pages/                 # River/ Ledger/ Income/ Spending/ RealEstate/ Wisdom/
        ├── hooks/                 # TanStack Query wrappers (useNetWorth, useAccounts…)
        ├── context/               # AuthContext — JWT + user profile
        ├── utils/                 # Currency formatting, tier logic, property math
        ├── types/                 # TypeScript interfaces mirroring API DTOs exactly
        ├── styles/                # CSS variables (Babylon gold/dark theme tokens)
        └── constants/             # TIERS array, WISDOM content, INCOME_TYPES
```

---

## Running Locally

Two terminal windows required:

```bash
# Terminal 1 — API
cd BabylonWealth.API
dotnet run

# Terminal 2 — React
cd babylon-wealth-client
npm run dev
```

**First-time setup:**

```bash
# Apply EF Core migrations (from Infrastructure project)
dotnet ef database update --project BabylonWealth.Infrastructure --startup-project BabylonWealth.API

# Seed runs automatically on startup if Banks table is empty
```

**Connection string** (`appsettings.Development.json`):
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Database=babylonwealth;Username=postgres;Password=yourpassword"
}
```

**React env** (`.env.development`):
```
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

**Run tests:**
```bash
dotnet test
```

---

## Architecture Rules

These are non-negotiable. Do not break them.

1. **Dependency direction:** API → Services → Core ← Infrastructure. Infrastructure is never directly referenced by Services or Core.

2. **Controllers are thin.** They receive a request, call one service method, return a DTO. Zero business logic in controllers.

3. **Entities are never serialized to JSON directly.** Always map through a DTO. This decouples the API contract from the database schema.

4. **Net worth is never stored — always computed live** from the current state of all accounts. Only `NetWorthSnapshot` records are stored (historical).

5. **Soft deletes everywhere.** Every entity has `IsDeleted` + `DeletedAt`. Never use `.Remove()` or hard deletes. EF Core global query filters on `BabylonDbContext` exclude soft-deleted records automatically.

6. **Enums stored as strings**, not integers. Use `[EnumMember(Value = "string")]`. This ensures database values survive enum reordering.

7. **Migrations are additive only.** Never remove or rename a column in a migration — add new nullable columns alongside old ones.

8. **Use `decimal`, never `double` or `float` for money.** Floating point errors compound in financial calculations.

9. **Spending transactions are immutable.** No PUT on spending records. Soft delete and re-enter if wrong (preserves audit trail).

10. **Repository interfaces live in Core, implementations in Infrastructure.** Services depend on interfaces only — fully mockable in tests.

---

## Domain Model Summary

All entities extend `BaseEntity<Guid>`: `Id`, `CreatedAt`, `UpdatedAt`, `IsDeleted`, `DeletedAt`.

| Entity | Key Fields |
|---|---|
| `User` | Email, PasswordHash, ProfilePhotoUrl |
| `Bank` | Name, LogoUrl, Type, SearchAliases (seeded, ~40 records) |
| `BankAccount` | UserId, BankId, CustomLabel, Balance, AccountType, BudgetCategoryId |
| `CreditCard` | BankId, CustomLabel, Balance, CreditLimit, APR, CardType (Personal/Business) |
| `Loan` | CustomLabel, LenderName, Balance (+ve stored, -ve displayed), InterestRate, LoanType |
| `Investment` | BankId, CustomLabel, CurrentValue, Ticker, InvestmentType |
| `PendingItem` | Description, Counterparty, Amount (+ve = owed to you), DueDate, Status |
| `IncomeSource` | Name, Type, AnnualAmount, IsActive |
| `InvestmentIncome` | Source, Type, Amount, Date (tracks passive income received) |
| `BudgetCategory` | Name, TargetPercentage (all categories must sum to 1.0), Color, DisplayOrder |
| `SpendingTransaction` | AccountId, CategoryId, Amount, Description, Date |
| `NetWorthSnapshot` | SnapshotDate, LiquidNetWorth, TotalNetWorth, TotalAssets, TotalLiabilities, Annotation |
| `Property` | Address, PurchasePrice, CurrentEstimatedValue, LoanBalance, MonthlyRent, MonthlyExpenses |

**Liquid NW** = cash + investments − all debts (no property)  
**Total NW** = Liquid NW + property equity (CurrentEstimatedValue − LoanBalance)

`PendingItem` with `Status = Pending` is **included** in NW calculation. `Settled` items are excluded.

---

## API Routes

All routes under `/api/v1/`. All except `/auth/*` require `Authorization: Bearer <token>`.

```
POST   /auth/register
POST   /auth/login

GET    /networth/current
GET    /networth/history
POST   /networth/snapshot
POST   /networth/annotate
GET    /networth/annotations?from=&to=

GET    /accounts
POST   /accounts
PUT    /accounts/{id}
DELETE /accounts/{id}

GET    /creditcards
POST   /creditcards
PUT    /creditcards/{id}

GET    /loans
POST   /loans
PUT    /loans/{id}

GET    /investments
POST   /investments
PUT    /investments/{id}

GET    /pending
POST   /pending
PATCH  /pending/{id}/settle

GET    /income
POST   /income
PUT    /income/{id}

GET    /investmentincome
POST   /investmentincome
GET    /investmentincome/summary

GET    /budget/categories
POST   /budget/categories
PUT    /budget/categories/{id}

GET    /spending?month=&year=
POST   /spending
GET    /spending/analytics?month=&year=

GET    /properties
POST   /properties
PUT    /properties/{id}
DELETE /properties/{id}
POST   /properties/analyze         # Stateless — no DB write, pure calculation

GET    /banks/search?q=
POST   /upload/profile
GET    /users/me
PUT    /users/me
GET    /health
```

---

## Frontend Structure

### Tabs / Pages

| Tab | Route | Description |
|---|---|---|
| River (Home) | `/` | Net worth display, tier animation, NW chart, Optimal River modal |
| Ledger | `/ledger` | Spreadsheet-style accounts: bank accounts, cards, loans, investments, pending |
| Income | `/income` | Income sources, Arkad's 10% savings target |
| Spending | `/spending` | Budget categories, transaction entry, analytics charts |
| Investment Income | `/investment-income` | Passive income tracking, passive vs. expenses ratio |
| Real Estate | `/real-estate` | Deal analyzer (stateless calculator + saved analyses) |
| Wisdom | `/wisdom` | Arkad's Seven Cures — static content, no API calls |

### Data Hooks (TanStack Query)

```ts
useNetWorth()           // GET /networth/current — staleTime: 30s
useNetWorthHistory()    // GET /networth/history + annotations
useAccounts()           // GET /accounts
useCreditCards()        // GET /creditcards
useLoans()              // GET /loans
useInvestments()        // GET /investments
usePendingItems()       // GET /pending
useIncome()             // GET /income
usePassiveIncome()      // GET /investmentincome/summary
useBudgetCategories()   // GET /budget/categories
useSpendingAnalytics()  // GET /spending/analytics
useProperties()         // GET /properties
useAuth()               // AuthContext — user profile, JWT
```

### River Tab Component Tree

```
<RiverTab>
  ├── <NetWorthPanel>
  │     ├── <UserGreeting />             // "Hello, Diego"
  │     ├── <NetWorthToggle />           // Liquid | Total pill
  │     ├── <NetWorthDisplay />          // Animates on scrub
  │     └── <NetWorthChart>
  │           ├── Recharts AreaChart
  │           ├── <ScrubCrosshair />     // Custom cursor — vertical line
  │           └── <AnnotationTick />     // Per snapshot with note
  │
  └── <RiverPanel>
        ├── <RiverStrengthLabel />       // Tier name
        ├── <AerialRiverScene />         // Nested SVG ovals, scales with tier
        ├── <StickFigureWithBucket />    // Animated character + bucket fill loop
        └── <OptimalRiverButton>
              └── <OptimalRiverModal />  // Slide-up — educational, no API call
```

---

## Key Conventions

### Naming
- **Controllers:** `AccountsController`, `CreditCardsController` — plural, Pascal case
- **Services:** `AccountService`, `NetWorthService` — singular
- **Interfaces:** `IAccountRepository`, `INetWorthService` — `I` prefix
- **DTOs:** `AccountResponseDto`, `CreateAccountRequest` — explicit suffix
- **Hooks:** `useNetWorth`, `useAccounts` — camelCase, `use` prefix
- **Test methods:** `NetWorthService_WithSoftDeletedAccount_ExcludesFromSum` — `[Method_Scenario_Expected]`

### Service Layer Pattern
```csharp
// Services contain all business logic
// Controllers call ONE service method and return the result
public async Task<NetWorthResponseDto> ComputeAsync(Guid userId)
{
    var accounts = await _accountRepo.GetAllByUserAsync(userId);
    var cards    = await _cardRepo.GetAllByUserAsync(userId);
    // ... aggregate, return DTO
}
```

### React Scrub Pattern (Net Worth Chart)
```tsx
const [scrubbedValue, setScrubbedValue] = useState<number | null>(null);
const displayValue = scrubbedValue ?? currentNetWorth;

// In Recharts onMouseMove:
const handleMouseMove = (state: any) => {
  if (state.isTooltipActive && state.activePayload) {
    setScrubbedValue(state.activePayload[0].value);
  }
};
const handleMouseLeave = () => setScrubbedValue(null);
```

### Query Invalidation on Mutation
```ts
// After any mutation (add account, settle pending item, etc.)
queryClient.invalidateQueries({ queryKey: ['networth'] });
queryClient.invalidateQueries({ queryKey: ['accounts'] });
```

### Axios Client
```ts
// src/api/client.ts — JWT attached automatically via request interceptor
// 401 response → interceptor redirects to /login
const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });
```

### Background Service Scope
```csharp
// BackgroundService must create its own DI scope to resolve scoped services
using var scope = _serviceProvider.CreateScope();
var snapshotService = scope.ServiceProvider.GetRequiredService<ISnapshotService>();
await snapshotService.TakeSnapshotAsync(userId);
```

---

## Design System

### Theme Tokens (CSS Variables)
```css
--color-bg:          #0D0D0D;   /* Near-black background */
--color-gold:        #C9A84C;   /* Primary accent — Arkad's gold */
--color-gold-hover:  #E2BB6B;   /* Gold hover state */
--color-river:       #1B7A6E;   /* River teal */
--color-text:        #F0EAD6;   /* Warm off-white */
--color-text-muted:  #8A8070;   /* Secondary text */
--color-positive:    #4CAF7D;   /* Asset / positive values */
--color-negative:    #E05555;   /* Liability / negative values */
```

### Chart Colors
- NW line/fill: `#C9A84C` (gold) when positive; red/amber when negative
- Fill gradient: gold at line → transparent at baseline (20% opacity)
- Crosshair: thin white vertical line
- Total NW (if properties exist): blue-teal second line

### Button Variants
- **Primary:** Gold fill, dark text — main actions
- **Secondary:** Gold outline, gold text — `See Optimal River` style
- **Danger:** Red outline — destructive actions (soft delete)

### River Oval SVG Pattern
```tsx
// Each ring is an SVG ellipse, layered outward with decreasing opacity
const rings = Array.from({ length: ringCount }, (_, i) => ({
  rx: 80 + i * 28,
  ry: 55 + i * 20,
  opacity: 0.9 - i * 0.18,
  animationDelay: `${i * 0.4}s`,
}));
// Rings breathe: CSS scale keyframe 1.0 → 1.03, ~4s loop
// Inner ring: subtle shimmer/ripple overlay
// Color: deep teal #1B7A6E, semi-transparent layers
```

---

## Tier System

Defined in `src/constants/tiers.ts`. Each tier object:

```ts
interface Tier {
  label: string;
  minNW: number;
  maxNW: number;
  emoji: string;
  riverRings: number;   // 0 = cracked earth SVG; 1–5 = ring count
  advice: string;       // Arkad's stage-specific wisdom
}
```

| Label | NW Range | Emoji | Rings |
|---|---|---|---|
| Scorched | < −$50k | 😭 | 0 (cracked earth) |
| Desert | −$50k to $0 | 😟 | 0 (cracked earth) |
| Dry Bed | $0 – $10k | 😐 | 1 |
| Stream | $10k – $25k | 🙂 | 2 |
| River | $25k – $50k | 😊 | 3 |
| Strong River | $50k – $100k | 😄 | 4 |
| Mighty River | $100k+ | 🥳 | 5 |

```ts
// Utility functions in src/utils/tiers.ts
getTier(netWorth: number): Tier
getTierProgress(netWorth: number): number  // 0–1 progress to next tier
```

---

## Real Estate Deal Metrics

Computed in `PropertyAnalyzerService` — all logic server-side:

| Metric | Formula |
|---|---|
| Monthly Cash Flow | Gross Rent − PITI − HOA − Maintenance − Vacancy |
| Cap Rate | (Annual NOI / Purchase Price) × 100 |
| Cash-on-Cash | (Annual Cash Flow / Total Cash Invested) × 100 |
| GRM | Purchase Price / Annual Gross Rent |
| Break-Even Rent | Monthly fixed costs / (1 − vacancy rate) |
| DSCR | NOI / Annual Debt Service |

**Deal signal logic (server-side, returned in DTO):**
- 🟢 Green: `CashFlow > 0 AND CapRate >= 5%`
- 🟡 Yellow: `CashFlow > 0 OR CapRate >= 4%`
- 🔴 Red: everything else

**Mortgage formula:** `M = P[r(1+r)^n] / [(1+r)^n − 1]`

---

## Snapshot Background Service

`SnapshotBackgroundService` runs every 6 hours. On each tick:
1. Is today Sunday?
2. Has it been 14+ days since the last snapshot?
3. If both true → `SnapshotService.TakeSnapshotAsync(userId)` → writes `NetWorthSnapshot`

Service is **idempotent** — safe to call multiple times. Requires Railway Hobby plan (~$5/mo) for 24/7 uptime (free tier sleeps).

---

## Budget Category Invariant

All budget categories for a user must sum to exactly `1.0` (100%). This is enforced in `BudgetCategoryService` — not in the controller, not in the UI alone.

**Default categories (seeded on user registration):**

| Category | Target % |
|---|---|
| Necessities | 50% |
| Investing | 15% |
| Travel | 15% |
| Savings | 10% |
| Shopping | 10% |

---

## Docs

Full reference documents are in `/docs/`:

| File | Contents |
|---|---|
| `docs/blueprint.md` | 56-day build plan, full architecture detail, all entity schemas |
| `docs/home-screen-spec.md` | River tab spec — layout, animations, component tree, scrub behavior |
| `docs/railway-deployment.md` | Step-by-step Railway + Vercel deployment guide, env vars, troubleshooting |

---

## Common Gotchas

- **Never query Infrastructure directly from Services.** Always go through the repository interface.
- **Never return an entity from a controller.** Map to a DTO first.
- **`PendingItem.Amount` sign convention:** positive = owed TO the user (asset); negative = user owes (liability).
- **`Loan.Balance` sign convention:** stored positive, displayed/computed as negative.
- **`CustomFields` column is `jsonb`.** Map as `Dictionary<string, string>` via EF Core owned entity. Adding new metadata = new key, no migration needed.
- **`ProfilePhotoUrl` goes to blob storage** (Azure Blob / Azurite locally). Never store image bytes in the DB.
- **Vercel + React Router:** `vercel.json` must have the `/(.*) → /` rewrite or page refreshes 404.
- **CORS:** After updating the Vercel URL, add `FRONTEND_URL` to Railway env vars and redeploy the API.

---

*✦ Babylon Wealth — Personal Finance, Built with Intention ✦*
