**✦ BABYLON WEALTH ✦**

**Full-Stack Personal Finance Application**

Project Blueprint & Build Plan

*A part of all you earn is yours to keep.*

  ----------------- ----------------- ----------------- -----------------
  **Frontend**      **Backend**       **Database**      **Auth**

  React + Vite      ASP.NET Core Web  PostgreSQL        Identity + JWT
                    API                                 

  TypeScript        C# class          EF Core           bcrypt passwords
                    libraries         Code-First        

  Recharts +        xUnit + Moq tests Migrations        HTTP-only cookies
  TanStack                            history           
  ----------------- ----------------- ----------------- -----------------

**1. Project Purpose & Vision**

Babylon Wealth is a personal-use, full-stack financial tracking
application inspired by The Richest Man in Babylon by George S. Clason.
The central metaphor is Arkad\'s river: passive income and invested
wealth that flows perpetually, versus the paycheck-to-paycheck \'water
bucket\' that empties and must be refilled each month. The app makes
this metaphor visual and actionable --- tracking the growth of the
user\'s river from a scorched desert (deep negative net worth) to a
mighty, multi-channeled river (substantial invested wealth).

The goal is not to replace a full financial platform like Mint or
Personal Capital. It is a deeply personal, highly intentional tracker
that reinforces disciplined money principles through every interaction.
Every screen is designed to answer one question: is your river growing?

**Core Design Principles**

- Visual storytelling first --- the river animation and tier progression
  are the emotional core of the app. Numbers matter, but the feeling of
  watching your river grow from a dry riverbed to a strong current is
  what drives engagement.

- Arkad\'s 10% law is embedded everywhere --- income entry automatically
  computes savings targets, budget categories enforce percentage
  discipline, and the investment income tab tracks whether the river is
  actually producing passive flow.

- Scalable by design --- every layer is interface-driven. Adding a new
  account type, a new income source category, or a new graph never
  breaks existing stored data. The database evolves additively through
  migrations.

- Cloud-ready from day one --- PostgreSQL is used from the start,
  eliminating any future migration overhead. The app is designed to
  deploy to Railway with minimal config changes.

- Personal and private --- no third-party bank integrations, no screen
  scraping. The user manually enters their data. This is intentional ---
  the act of entering numbers forces awareness.

**2. Application Tabs & Feature Map**

**Tab 1 --- River (Home Screen)**

The main screen. The user\'s current net worth is displayed prominently
at the top. Below it, a dynamic animated scene renders based on the
current net worth tier --- every \$5,000 in either direction triggers a
visual change, from a scorched wasteland at -\$70k to multiple wide
rivers at \$100k+.

- Tier progression: scorched (-\$70k) → desert → dunes → foundation →
  dry riverbed → first drop → stream → river → strong river → mighty
  river (\$100k+). Above \$100k, additional rivers appear.

- Character emoji bounces on screen matching the tier (😭 through 🥳)
  --- gives emotional feedback and personality.

- Milestone progress bar shows how far to the next \$5k tier unlock.

- Stage-specific advice from Arkad rendered per tier.

- River sub-tab: Optimal River --- shows the wealthy person\'s model
  visually. River (passive income) flows into two channels: lifestyle
  spending and reinvestment. Educational, not based on user data.

- Net Worth Over Time button --- opens a detailed chart showing liquid
  net worth and total net worth as two separate lines over time. Chart
  supports tap-to-annotate: user can add a text note to any data point
  (e.g. \'Got new job at Microsoft\'). Notes display as small flags on
  the chart.

- Snapshot is recorded automatically every two weeks on Sunday night via
  a background service --- no user action required.

**Tab 2 --- Ledger (Accounts)**

Spreadsheet-style table layout using TanStack Table. Rows are
inline-editable, columns are sortable, totals rows are bold and
auto-computed. Color coded: green for assets, red for liabilities.

- Cash Accounts --- bank name (with logo from seeded bank library),
  custom label, linked budget category, balance.

- Business Credit Cards --- bank, label, current balance, APR, credit
  limit, notes column.

- Personal Credit Cards --- same fields as business, flagged as
  personal.

- Loans & Debt --- lender, label, balance (shown negative), interest
  rate, loan type.

- Investments --- brokerage/bank, label, current value, optional ticker
  symbol, investment type.

- Pending Items --- description, counterparty, amount (positive = owed
  to you, negative = you owe), due date, status (pending/settled).
  Affects net worth while pending.

- Bank logo auto-population --- when adding an account, user selects
  from a searchable dropdown of pre-seeded banks.

**Tab 3 --- Income**

Tracks all earned income streams. Displays annual total, monthly
equivalent, and Arkad\'s 10% savings target per month.

- Income types: Salary, RSU / Stock Compensation, Bonus, Business
  Income, Rental Income, Other.

- Arkad\'s Law panel: \'To follow the First Cure, save X per month ---
  one coin of every ten.\'

**Tab 4 --- Spending & Budget**

Percentage-based budgeting against total income. Default categories:
Necessities (50%), Investing (15%), Travel (15%), Savings (10%),
Shopping (10%). Fully customizable. Graphs: spending vs. earning,
per-category breakdown, invested amount line.

**Tab 5 --- Investment Income (Passive / Liability Spend)**

Tracks what the river actually produces --- passive income received.
Entry types: Dividend, Rental Income Received, Business Distribution,
Interest Income, Other. Running total of passive income per month vs.
total monthly expenses. The goal line: passive income \>= living
expenses.

**Tab 6 --- Real Estate Analyzer**

Deal analysis tool for evaluating rental property investments. Two
modes: Calculator (no save, pure math) and Saved Analysis (persisted per
property). Outputs: monthly cash flow, cap rate, cash-on-cash return,
GRM, break-even rent, DSCR. Deal signal: green / yellow / red indicator
with plain-English explanation.

**Tab 7 --- Wisdom**

Static content tab. Arkad\'s Seven Cures presented as rich cards. No
backend calls. Fully hardcoded in the React component.

**3. Domain Model --- Entities & Relationships**

Every entity inherits from BaseEntity: Id (Guid), CreatedAt, UpdatedAt,
IsDeleted, DeletedAt. Records are never hard-deleted --- soft delete
sets IsDeleted = true, protecting historical data.

**User**

  --------------------- -------------------------------------------------
  **Field**             **Description**

  Id (Guid)             Primary key --- globally unique

  Email                 Unique login identifier

  PasswordHash          bcrypt hash --- never store plain text passwords

  ProfilePhotoUrl       Azure Blob URL for profile photo --- null until
                        set

  CreatedAt / UpdatedAt Auto-managed by EF Core on save

  IsDeleted             Soft delete flag
  --------------------- -------------------------------------------------

**Bank (Seeded Reference Data)**

  --------------------- -------------------------------------------------
  **Field**             **Description**

  Id (Guid)             Primary key

  Name                  Official bank name (e.g. JPMorgan Chase)

  LogoUrl               Public CDN URL --- served to frontend

  Type                  Enum: Personal \| Business \| Both

  SearchAliases         Comma-separated nicknames for search

  CountryCode           US by default --- future international support
  --------------------- -------------------------------------------------

**BankAccount**

  --------------------- -------------------------------------------------
  **Field**             **Description**

  UserId                FK to User --- all data is user-scoped

  BankId                FK to Bank --- populates logo and name

  CustomLabel           User-defined name, e.g. \'Chase Necessities
                        Checking\'

  Balance               Current balance in USD (decimal)

  AccountType           Enum: Checking \| Savings \| MoneyMarket

  BudgetCategoryId      FK to BudgetCategory --- links account to
                        spending bucket

  Notes                 Optional freeform text

  CustomFields          jsonb column --- arbitrary key-value pairs,
                        future-proof
  --------------------- -------------------------------------------------

**CreditCard**

  --------------------- -------------------------------------------------
  **Field**             **Description**

  BankId                FK to Bank

  CustomLabel           User-defined card name

  Balance               Current balance owed (positive number, treated as
                        liability)

  CreditLimit           Total credit limit

  APR                   Annual percentage rate (decimal, e.g. 0.27 = 27%)

  CardType              Enum: Personal \| Business
  --------------------- -------------------------------------------------

**Loan**

  --------------------- -------------------------------------------------
  **Field**             **Description**

  CustomLabel           e.g. \'SoFi Personal Loan\'

  LenderName            Optional --- separate from bank if not a bank
                        loan

  Balance               Remaining balance (stored positive, rendered
                        negative)

  InterestRate          Decimal --- e.g. 0.115 for 11.5%

  LoanType              Enum: Personal \| Student \| Auto \| HELOC \|
                        Business \| Other
  --------------------- -------------------------------------------------

**Investment**

  --------------------- -------------------------------------------------
  **Field**             **Description**

  BankId                FK to Bank (brokerage)

  CustomLabel           e.g. \'TD Ameritrade Brokerage\'

  CurrentValue          Current market value in USD

  Ticker                Optional --- e.g. MSFT, VTI, BTC

  InvestmentType        Enum: Brokerage \| Retirement401k \| RothIRA \|
                        Crypto \| Other
  --------------------- -------------------------------------------------

**PendingItem**

  --------------------- -------------------------------------------------
  **Field**             **Description**

  Description           e.g. \'Uber reimbursement --- Isaac\'

  Counterparty          Person or company name (optional)

  Amount                Positive = owed to user; Negative = user owes

  DueDate               Optional target date

  Status                Enum: Pending \| Settled

  SettledAt             DateTime --- set when marked settled, drops from
                        NW calc
  --------------------- -------------------------------------------------

**IncomeSource**

  --------------------- -------------------------------------------------
  **Field**             **Description**

  Name                  e.g. \'Microsoft Salary\', \'Consulting LLC\'

  Type                  Enum: Salary \| RSU \| Bonus \| Business \|
                        Rental \| Other

  AnnualAmount          Total annual figure in USD

  IsActive              Supports deactivating without deleting (job
                        change)
  --------------------- -------------------------------------------------

**BudgetCategory**

  --------------------- -------------------------------------------------
  **Field**             **Description**

  Name                  e.g. \'Necessities\', \'Investing\', \'Travel\'

  TargetPercentage      Decimal --- e.g. 0.50 for 50%. All categories
                        must sum to 1.0

  Color                 Hex string for chart rendering

  DisplayOrder          Integer --- controls sort order in UI
  --------------------- -------------------------------------------------

**NetWorthSnapshot**

  --------------------- -------------------------------------------------
  **Field**             **Description**

  SnapshotDate          DateTime of capture

  LiquidNetWorth        Assets minus liabilities, excluding properties

  TotalNetWorth         Liquid NW plus property equity (value minus loan)

  TotalAssets           Cash + investments total

  TotalLiabilities      Cards + loans total

  TotalCreditUsed       Sum of all card balances

  TotalCreditLimit      Sum of all card limits

  TotalPending          Sum of pending items affecting NW

  Annotation            User-added note. Displays as flag on chart.
  --------------------- -------------------------------------------------

**Property**

  ----------------------- -------------------------------------------------
  **Field**               **Description**

  Address                 Property address string

  PurchasePrice           Original price paid

  CurrentEstimatedValue   User-updated periodically

  LoanBalance             Remaining mortgage balance

  InterestRate            Current loan interest rate

  LoanType                Enum: Conventional \| FHA \| VA \| DSCR \| Cash

  MonthlyRent             Expected gross monthly rent

  MonthlyExpenses         PITI + HOA + maintenance reserve
  ----------------------- -------------------------------------------------

**4. Backend Solution Architecture**

The solution follows a layered, interface-driven architecture where each
layer has a single responsibility and dependencies only point inward
(toward Core). No outer layer knows how an inner layer works --- it only
knows the interface. This is the Dependency Inversion Principle.

**BabylonWealth.Core (Class Library)**

The innermost layer. No dependencies on EF Core, ASP.NET, or any
infrastructure concern. It is the source of truth for what exists in the
system.

- Entities/ --- all domain entity classes, each extending
  BaseEntity\<Guid\>

- Interfaces/Repositories/ --- one interface per entity or entity group:
  IAccountRepository, ICreditCardRepository, ILoanRepository,
  IInvestmentRepository, IPendingItemRepository, IIncomeRepository,
  IInvestmentIncomeRepository, IBudgetCategoryRepository,
  ISpendingRepository, INetWorthRepository, IPropertyRepository,
  IBankRepository, IAnnotationRepository

- Interfaces/Services/ --- INetWorthService, IBudgetAnalyticsService,
  IPropertyAnalyzerService, IPassiveIncomeService, ISnapshotService,
  IBankSearchService

- DTOs/ --- split into Requests/ and Responses/. Entities are never
  returned directly from controllers.

- Enums/ --- all enums stored with \[EnumMember(Value = \'string\')\]
  attributes so EF Core persists them as strings, not integers.

- Exceptions/ --- domain-specific exceptions: NotFoundException,
  ValidationException, DuplicateEntryException

**BabylonWealth.Infrastructure (Class Library)**

The data access layer. Knows about EF Core and PostgreSQL. Referenced
only by the API project via DI.

- Persistence/BabylonDbContext.cs --- the EF Core DbContext. Configures
  global query filters (soft delete:
  modelBuilder.Entity\<T\>().HasQueryFilter(e =\> !e.IsDeleted)) so
  deleted records are automatically excluded from every query.

- Persistence/Configurations/ --- one IEntityTypeConfiguration\<T\> per
  entity. Configures relationships, column types (jsonb for CustomFields
  via Npgsql), string length limits, and enum storage as strings.

- Persistence/Migrations/ --- auto-generated by EF Core. Each migration
  is additive only.

- Repositories/ --- concrete EF Core implementations of every repository
  interface. Methods are async throughout.

- Seeders/BankSeeder.cs --- runs on startup if the Banks table is empty.
  Inserts \~40 common US bank/brokerage records.

- Extensions/InfrastructureExtensions.cs --- registers all repositories,
  DbContext (UseNpgsql), and services into DI in a single call from
  Program.cs.

**BabylonWealth.Services (Class Library)**

Business logic layer. Depends on Core interfaces only --- never on
Infrastructure directly. All domain computation lives here, not in
controllers or repositories.

- NetWorthService --- computes liquid NW and total NW. Handles the dual
  net worth calculation for property owners.

- BudgetAnalyticsService --- computes monthly income vs. spending,
  per-category breakdown, invested amount, comparison against percentage
  targets.

- PropertyAnalyzerService --- pure calculation. Takes
  PropertyAnalysisRequest DTO, returns full analysis: monthly cash flow,
  cap rate, cash-on-cash return, GRM, DSCR, break-even rent, deal
  signal.

- PassiveIncomeService --- aggregates InvestmentIncome records, computes
  monthly passive income trend, compares to monthly living expenses.

- SnapshotService --- called by the background service every two weeks.
  Calls NetWorthService, writes a NetWorthSnapshot record. Idempotent.

**BabylonWealth.API (ASP.NET Core Web API)**

The entry point and HTTP layer. Controllers are thin --- they receive
requests, call a service, and return DTOs.

- Controllers/ --- organized by domain. All routes are under /api/v1/
  for future versioning safety.

- Middleware/JwtMiddleware.cs --- validates JWT on every authenticated
  request.

- Middleware/ErrorHandlingMiddleware.cs --- catches all unhandled
  exceptions, returns consistent JSON error responses.

- BackgroundServices/SnapshotBackgroundService.cs --- IHostedService.
  Runs on a 6-hour timer. Checks if Sunday and 14+ days since last
  snapshot, then calls SnapshotService.

- Swagger configured with JWT authentication support --- all endpoints
  testable without the React frontend.

**BabylonWealth.Tests (xUnit Test Project)**

- Services/ --- unit tests for NetWorthService, BudgetAnalyticsService,
  PropertyAnalyzerService. Repositories mocked with Moq.

- Helpers/MockFactory.cs --- factory methods for building test entities
  and mock repository setups.

**5. API Endpoint Reference**

All endpoints are under /api/v1/. All except Auth endpoints require a
valid JWT in the Authorization: Bearer \<token\> header.

  ------------ -------------------------------- -----------------------------------------
  **Method**   **Route**                        **Description**

  POST         /api/v1/auth/register            Register new user --- hashes password,
                                                returns JWT

  POST         /api/v1/auth/login               Authenticate --- returns JWT + user
                                                profile

  GET          /api/v1/networth/current         Compute live net worth (liquid + total)

  GET          /api/v1/networth/history         Snapshot history for chart

  POST         /api/v1/networth/snapshot        Manually trigger a snapshot

  POST         /api/v1/networth/annotate        Add/edit annotation on a date point

  GET          /api/v1/accounts                 All bank accounts for user

  POST         /api/v1/accounts                 Create bank account

  PUT          /api/v1/accounts/{id}            Update account balance or label

  DELETE       /api/v1/accounts/{id}            Soft delete account

  GET          /api/v1/creditcards              All credit cards (personal + business)

  POST         /api/v1/creditcards              Add credit card

  PUT          /api/v1/creditcards/{id}         Update balance, limit, APR

  GET          /api/v1/loans                    All loans

  POST         /api/v1/loans                    Add loan

  PUT          /api/v1/loans/{id}               Update loan balance

  GET          /api/v1/investments              All investment accounts

  POST         /api/v1/investments              Add investment account

  PUT          /api/v1/investments/{id}         Update current value

  GET          /api/v1/pending                  All pending items

  POST         /api/v1/pending                  Add pending item

  PATCH        /api/v1/pending/{id}/settle      Mark pending item as settled

  GET          /api/v1/income                   All income sources

  POST         /api/v1/income                   Add income source

  PUT          /api/v1/income/{id}              Update income amount

  GET          /api/v1/investmentincome         All passive income records

  POST         /api/v1/investmentincome         Record passive income received

  GET          /api/v1/budget/categories        User\'s budget categories

  POST         /api/v1/budget/categories        Add budget category

  PUT          /api/v1/budget/categories/{id}   Update category name/percentage

  GET          /api/v1/spending                 Spending transactions (filterable by
                                                month)

  POST         /api/v1/spending                 Add spending transaction

  GET          /api/v1/spending/analytics       Monthly breakdown vs budget targets

  GET          /api/v1/properties               All saved properties

  POST         /api/v1/properties               Save property analysis

  PUT          /api/v1/properties/{id}          Update value, loan balance, rent

  POST         /api/v1/properties/analyze       One-off analysis --- no save, returns
                                                full analysis DTO

  GET          /api/v1/banks/search?q=          Search bank library --- returns name +
                                                logo URL

  POST         /api/v1/upload/profile           Upload profile photo --- returns Blob URL

  GET          /api/v1/users/me                 Current user profile

  PUT          /api/v1/users/me                 Update profile
  ------------ -------------------------------- -----------------------------------------

**6. Frontend Architecture**

React with Vite as the build tool. TypeScript throughout. API calls via
Axios with a central API client that attaches the JWT automatically.
TanStack Query for server state management.

**Project Structure**

  ------------------ ----------------------------------------------------
  **Folder / File**  **Purpose**

  src/api/           Axios client + per-domain API call functions

  src/components/    Reusable UI components (Button, Modal, TableCell,
                     Tooltip, RiverScene, DesertScene, CharacterEmoji)

  src/pages/         One folder per tab: River/, Ledger/, Income/,
                     Spending/, InvestmentIncome/, RealEstate/, Wisdom/

  src/hooks/         Custom hooks wrapping TanStack Query calls
                     (useNetWorth, useAccounts, useSpending)

  src/context/       AuthContext --- stores JWT, user profile, expiry.
                     Wraps the whole app.

  src/utils/         Formatting (currency, percentages, dates), tier
                     calculation, property math

  src/types/         TypeScript interfaces mirroring the API DTOs

  src/styles/        Global CSS variables (the Babylon gold/dark theme
                     tokens)

  src/constants/     TIERS array, WISDOM content, INCOME_TYPES --- static
                     data that never hits the API
  ------------------ ----------------------------------------------------

**Key Libraries**

- Recharts --- area charts, line charts for net worth history and
  spending graphs.

- TanStack Table --- spreadsheet-style table for the Ledger tab.

- TanStack Query --- server state, caching. Every API call goes through
  a query hook.

- React Router v6 --- client-side routing between tabs.

- Axios --- HTTP client. Central instance adds Authorization header via
  request interceptor.

- date-fns --- date formatting and manipulation.

- Framer Motion --- river and character animations, tab transition
  animations.

**7. Biweekly Snapshot Background Service**

The snapshot system captures the user\'s net worth automatically every
two weeks on Sunday night, implemented as an ASP.NET Core
BackgroundService. On startup it registers with DI and runs on a loop
every 6 hours. Each iteration: (1) Is today Sunday? (2) Has it been 14+
days since the last snapshot? If both are true, it calls
SnapshotService.TakeSnapshotAsync(userId) and writes a NetWorthSnapshot
record. The service is idempotent --- it skips if a snapshot was already
taken this week.

Since the app is deployed to Railway and the API runs 24/7 in the cloud,
snapshots trigger exactly on schedule.

**8. Scalability & Future-Proofing Principles**

**Additive-Only Migrations**

The golden rule of EF Core Code-First: never remove or rename a database
column in a migration. Instead, add new nullable columns alongside old
ones. Old data retains its values in the original columns.

**Soft Deletes Everywhere**

Every entity has IsDeleted and DeletedAt. Records are never physically
removed. EF Core global query filters automatically exclude soft-deleted
records from all queries.

**Enum Storage as Strings**

All enums are stored as their string representation (e.g. \'Checking\',
\'Business\', \'Conventional\') not as integers. If you add a new enum
value or reorder them, the database values remain correct.

**CustomFields jsonb Column**

Every entity has a CustomFields column of type jsonb (PostgreSQL native
JSON). Adding a new piece of metadata never requires a migration --- it
is just a new key in the JSON. EF Core maps this as Dictionary\<string,
string\> via the owned entity pattern.

**DTOs as the API Contract**

Entities are never serialized directly to JSON. They always pass through
a DTO mapping step. This means database schema changes do not
automatically change the API response shape.

**Interface-Driven Services and Repositories**

Every service and every repository has a corresponding interface in
Core. Tests can mock any dependency. Implementations can be swapped
without changing any service that depends on the interface.

**9. Day-by-Day Build Plan**

Assumes roughly 1--2 hours per day of focused build time. Each day has a
clear deliverable. The plan prioritizes getting a working vertical slice
early, then expanding feature by feature.

**Week 1 --- Solution Scaffold, Entities, EF Core (PostgreSQL), Auth**
*\| Goal: A running API with authentication, all entities in the
PostgreSQL database, and Swagger testable*

**Day 1: Solution scaffold + project structure**

Build: Create BabylonWealth.sln. Add five projects: API, Core,
Infrastructure, Services, Tests. Set project references: API references
Core/Services/Infrastructure. Services references Core. Infrastructure
references Core. Tests references Core and Services. Create folders per
the architecture section. Initialize a Git repo, push first commit.

*Patterns: Solution architecture, project separation, dependency
direction*

Takeaway: Why enterprise codebases split into multiple projects: each
compiles independently and enforces that business logic cannot
accidentally import database code.

**Day 2: BaseEntity + all Core entities**

Build: Create BaseEntity\<TKey\> with Id, CreatedAt, UpdatedAt,
IsDeleted, DeletedAt. Create all entities in Core/Entities/: User, Bank,
BankAccount, CreditCard, Loan, Investment, PendingItem, IncomeSource,
InvestmentIncome, BudgetCategory, SpendingTransaction,
MonthlyBudgetSnapshot, NetWorthSnapshot, NetWorthAnnotation, Property.
Use private setters and static factory methods to protect invariants.
Create all enums in Core/Enums/ with string-friendly naming.

*Patterns: Encapsulation via private setters, factory methods, guard
clauses*

Takeaway: Why entities protect their own invariants. You never let
outside code set entity.Status = Deleted. You expose entity.SoftDelete()
which sets both IsDeleted and DeletedAt atomically.

**Day 3: All repository interfaces + service interfaces**

Build: In Core/Interfaces/Repositories/: create IBaseRepository\<T,
TKey\> with GetByIdAsync, GetAllByUserAsync, CreateAsync, UpdateAsync,
SoftDeleteAsync. Create entity-specific interfaces extending
IBaseRepository. In Core/Interfaces/Services/: create INetWorthService,
IBudgetAnalyticsService, IPropertyAnalyzerService,
IPassiveIncomeService, ISnapshotService, IBankSearchService.

*Patterns: Interface segregation principle, generic repository pattern
with IBaseRepository\<T\>, covariance/contravariance awareness*

Takeaway: Every repository sits behind an interface so tests can mock
the database entirely. The service layer never knows if it\'s talking to
PostgreSQL or a mock. This is the foundation of testability.

**Day 4: EF Core DbContext + PostgreSQL setup + first migration**

Build: Install Npgsql.EntityFrameworkCore.PostgreSQL and
Microsoft.EntityFrameworkCore.Tools NuGet packages. Create
BabylonDbContext : DbContext with DbSet for every entity. Add global
query filters for soft delete: HasQueryFilter(e =\> !e.IsDeleted).
Create Configurations/ folder with one IEntityTypeConfiguration\<T\> per
entity --- configure relationships, column types (jsonb for CustomFields
using Npgsql\'s HasColumnType(\"jsonb\")), string lengths, and enum
storage as string. Add PostgreSQL connection string to
appsettings.Development.json
(Host=localhost;Database=babylonwealth;Username=postgres;Password=yourpassword).
Run dotnet ef migrations add InitialCreate from Infrastructure project.
Run dotnet ef database update. Verify tables exist in PostgreSQL.

*Patterns: EF Core Fluent API configuration, Npgsql provider setup,
global query filters, IEntityTypeConfiguration\<T\> pattern,
Add-Migration workflow*

Takeaway: Code-First means the C# classes are the source of truth. EF
Core reads your entity configurations and generates the SQL to create
matching tables in PostgreSQL. The migration file is the recorded
history of every schema change.

**Day 5: ASP.NET Core Identity + JWT authentication**

Build: Install Microsoft.AspNetCore.Identity.EntityFrameworkCore and
Microsoft.AspNetCore.Authentication.JwtBearer. Extend BabylonDbContext
to inherit from IdentityDbContext\<ApplicationUser\>. Create
ApplicationUser : IdentityUser. Configure JWT in appsettings. Create
JwtService that generates a signed JWT. Create AuthController with POST
/api/v1/auth/register and POST /api/v1/auth/login. Test both in Swagger.

*Patterns: ASP.NET Core Identity password hashing, JWT structure
(header.payload.signature), AddAuthentication/AddJwtBearer DI
registration*

Takeaway: Identity handles all the security complexity: bcrypt hashing,
lockout policies, password validation. JWT is stateless --- the token
itself is the proof of identity.

**Day 6: All repository implementations + DI registration**

Build: In Infrastructure/Repositories/: implement BaseRepository\<T,
TKey\> : IBaseRepository\<T, TKey\> with full async EF Core methods.
Create entity-specific repositories extending BaseRepository. In
Extensions/InfrastructureExtensions.cs: register all repositories as
AddScoped\<IXRepository, XRepository\>(). Register DbContext with
AddDbContext using Npgsql provider and the PostgreSQL connection string.
Verify DI resolves correctly by adding a test controller endpoint.

*Patterns: Generic base class with concrete overrides, AddScoped vs
AddSingleton vs AddTransient, constructor injection*

Takeaway: The DI container builds the entire object graph per request.
When a request hits AccountsController, ASP.NET automatically resolves
IAccountRepository → AccountRepository → BabylonDbContext.

**Day 7: BankSeeder + first Swagger test end-to-end**

Build: Create BankSeeder.cs with \~40 US banks/brokerages with
placeholder logo URL paths. Call seeder from Program.cs on startup if
Banks table is empty. Create BanksController with GET
/api/v1/banks/search?q= endpoint. Test in Swagger. Confirm PostgreSQL DB
has bank records. Git commit: \'Week 1 complete --- scaffold, entities,
auth, seeder.\'

*Patterns: Database seeding pattern, startup services, IServiceScope for
running EF operations outside of request context*

Takeaway: Seeded reference data (banks) is read-only from the user\'s
perspective but lives in the same database. The seeder runs once and is
idempotent --- safe to call every startup.

**Week 2 --- Core CRUD: Accounts, Cards, Loans, Investments** *\| Goal:
The Ledger tab is fully functional on the backend. Net worth can be
computed.*

**Day 8: AccountsController + service + all CRUD**

Build: Create AccountService implementing GetAllAsync, CreateAsync,
UpdateAsync, SoftDeleteAsync. Create AccountsController with GET, POST,
PUT, DELETE for /api/v1/accounts. Map entities to AccountResponseDto.
Test all four endpoints in Swagger with a real JWT.

*Patterns: Service layer pattern, DTO mapping (manual mapping
recommended at this scale), input validation with data annotations*

Takeaway: Controllers should be thin orchestrators. The service contains
the business rules.

**Day 9: CreditCardsController --- personal and business**

Build: Create CreditCardService and CreditCardsController. Add CardType
filter. Compute UtilizationRate in the response DTO (balance /
creditLimit \* 100). Test filtering in Swagger. Verify soft delete does
not appear in GET results.

*Patterns: Query filtering with enum parameters, computed DTO
properties, global query filter behavior verification*

Takeaway: Utilization rate is a computed property --- it belongs in the
DTO mapping, not in the database.

**Day 10: LoansController**

Build: Create LoanService and LoansController. Loan balances stored as
positive numbers internally, rendered negative in the DTO. Create
LoanType enum. Add GET /api/v1/loans/summary endpoint for total
outstanding loan balance.

*Patterns: Stored vs displayed representation (positive stored, negative
displayed), summary endpoints that aggregate across a collection*

Takeaway: Storing negative numbers directly in the database creates
ambiguity. Storing positive and flipping the sign in the DTO is explicit
about intent.

**Day 11: InvestmentsController + PendingItemsController**

Build: Create InvestmentService, InvestmentsController. Add
InvestmentType enum. Create PendingItemService, PendingItemsController.
Add PATCH /api/v1/pending/{id}/settle. Pending items with Status =
Pending are included in net worth; Settled are excluded.

*Patterns: PATCH for partial updates (settle = one field change),
conditional inclusion in aggregated calculations based on status enum*

Takeaway: PATCH vs PUT: PUT replaces the entire resource. PATCH updates
specific fields. Settling a pending item is a state transition.

**Day 12: NetWorthService --- live computation**

Build: Implement NetWorthService.ComputeAsync(userId) which aggregates
all bank account balances, investment values, credit card balances, loan
balances, pending items. Returns NetWorthResponseDto with
LiquidNetWorth, TotalCreditUsed, CreditUtilizationRate. Create GET
/api/v1/networth/current.

*Patterns: Aggregation queries with LINQ (Sum, Where, GroupBy),
computing derived values from multiple entity types in a single service
method*

Takeaway: Net worth is never stored --- it is always computed live from
the current state of all entities. Only snapshots (historical records)
are stored.

**Day 13: SnapshotService + biweekly BackgroundService**

Build: Implement SnapshotService.TakeSnapshotAsync(userId): calls
NetWorthService, writes NetWorthSnapshot. Create
SnapshotBackgroundService : BackgroundService. Run on a 6-hour timer. On
each tick: if Sunday AND 14+ days since last snapshot, call
TakeSnapshotAsync. Register with AddHostedService. Create GET
/api/v1/networth/history.

*Patterns: IHostedService/BackgroundService lifecycle, ExecuteAsync with
CancellationToken, timer loop pattern, idempotency checks*

Takeaway: BackgroundService runs in the same process as the API but on a
separate thread. It has its own DI scope --- you must create
IServiceScope manually inside it to resolve scoped services like
DbContext.

**Day 14: NetWorthAnnotationsController + chart annotation prep**

Build: Create NetWorthAnnotation entity operations. POST
/api/v1/networth/annotate: takes AnnotationDate, Text, Category,
optional SnapshotId. GET /api/v1/networth/annotations?from=&to= returns
all annotations in a date range. Git commit: \'Week 2 complete.\'

*Patterns: Date range filtering in EF Core, optional FK relationships,
enum-to-color mapping in DTOs*

Takeaway: Annotations are independent of snapshots --- a user might
annotate \'got a raise\' on a date with no snapshot. The frontend
renders annotations as overlay flags regardless.

**Week 3 --- Income, Budget, Spending** *\| Goal: The Income and
Spending tabs are fully functional on the backend. Budget analytics
service is complete and tested.*

**Day 15: IncomeController + IncomeService**

Build: Implement IncomeService with GetAllAsync, CreateAsync,
UpdateAsync, SoftDeleteAsync, GetAnnualTotalAsync. Create
IncomeController. Response DTO includes AnnualAmount, MonthlyAmount
(annual/12), ArkadSavingsTarget (annual \* 0.10). Test in Swagger.

*Patterns: Derived DTO fields, service-layer aggregation, decimal
precision for financial calculations (always use decimal, never double
or float)*

Takeaway: Never use double or float for money --- floating point
precision errors accumulate in financial calculations. C# decimal is
fixed-point and safe for currency.

**Day 16: BudgetCategoriesController**

Build: Implement BudgetCategoryService. Enforce the 100% invariant: when
creating or updating categories, validate that the new total percentage
across all user categories does not exceed 1.0. Seed default categories
for new users (Necessities 50%, Investing 15%, Travel 15%, Savings 10%,
Shopping 10%). Test adding a category that would push over 100%.

*Patterns: Business rule enforcement in the service layer (not the
controller), custom validation exceptions, seeding user-specific
defaults on registration*

Takeaway: The 100% invariant is a business rule. It belongs in the
service, not in a controller attribute.

**Day 17: SpendingController + transactions**

Build: Implement SpendingService with CreateAsync,
GetByMonthAsync(userId, month, year), GetByAccountAsync,
GetByCategoryAsync. Transactions are immutable once created (no PUT ---
use soft delete and re-enter if wrong). Add GET
/api/v1/spending?month=4&year=2026 for filtered retrieval.

*Patterns: Immutable records (no update, only create/delete) as a
financial data pattern, month/year filtering in LINQ*

Takeaway: Financial transactions should generally be immutable. If you
entered the wrong amount, you soft delete and re-enter. This preserves
an audit trail.

**Day 18: BudgetAnalyticsService**

Build: Implement BudgetAnalyticsService.GetMonthlyAnalyticsAsync(userId,
month, year): retrieves all income sources, all spending transactions
for the month grouped by category, computes actual vs target percentage
per category, computes total invested. Create GET
/api/v1/spending/analytics?month=&year=.

*Patterns: LINQ GroupBy for category aggregation, joining two data
sources, percentage deviation computation*

Takeaway: Analytics endpoints should be read-only aggregations. They
never write to the database.

**Day 19: InvestmentIncomeController**

Build: Implement InvestmentIncomeService with CreateAsync, GetAllAsync,
GetMonthlyTotalAsync, GetAnnualTotalAsync. Add GET
/api/v1/investmentincome/summary: returns monthly passive income for
last 12 months, total annual passive income, and
PassiveIncomeVsExpensesRatio.

*Patterns: 12-month rolling aggregation with LINQ GroupBy on year/month,
ratio computation, trend data shape for chart consumption*

Takeaway: The passive income vs expenses ratio is the most important
number in the river metaphor. When it hits 1.0, the river covers all
expenses.

**Day 20: MonthlyBudgetSnapshot job + unit tests --- Week 3**

Build: Extend SnapshotBackgroundService to also write a
MonthlyBudgetSnapshot on the first Sunday of each month. Write xUnit
unit tests for BudgetAnalyticsService using Moq-mocked repositories. Git
commit: \'Week 3 complete.\'

*Patterns: Monthly snapshot logic with idempotency, xUnit \[Fact\] and
\[Theory\], Moq Setup/Returns*

Takeaway: Unit tests should test behavior, not implementation. Test that
BudgetAnalyticsService returns the correct over-budget flag given
specific inputs.

**Day 21: Unit tests --- NetWorthService + PropertyAnalyzerService
preview**

Build: Write xUnit tests for NetWorthService: verify net worth correctly
sums assets, subtracts liabilities, includes pending items, excludes
settled pending items, excludes soft-deleted accounts. Write the
PropertyAnalyzerService class stub. Git commit: \'All NetWorthService
tests green.\'

*Patterns: Test isolation (each test sets up its own mock data
independently), boundary testing, negative number handling*

Takeaway: The best time to write a test is immediately after you write
the feature. Tests serve as living documentation.

**Week 4 --- Real Estate Analyzer Backend** *\| Goal:
PropertyAnalyzerService is complete. Properties can be saved and
retrieved. Full Swagger test coverage.*

**Day 22: PropertyAnalyzerService --- mortgage math**

Build: Implement mortgage payment calculation: M = P\[r(1+r)\^n\] /
\[(1+r)\^n-1\]. Handle all loan types: Conventional (LTV determines
PMI), FHA (MIP: 0.55% annual), VA (0% down, no PMI), DSCR
(income-based). Return first 12 months of amortization. Test with known
values against online mortgage calculator.

*Patterns: Financial formula implementation in C#, decimal precision for
amortization, loan type polymorphism*

Takeaway: Financial math must be exact. Verify every formula against a
trusted external calculator.

**Day 23: PropertyAnalyzerService --- cash flow + deal metrics**

Build: Implement: Monthly Cash Flow, Cap Rate, Cash-on-Cash Return, GRM,
Break-Even Rent. Deal signal logic: CashFlow \> 0 AND CapRate \>= 5% =
Green. CashFlow \> 0 OR CapRate \>= 4% = Yellow. Otherwise = Red. Write
10+ unit tests.

*Patterns: Multi-metric financial analysis, deal signal as business rule
(not UI logic), test coverage for boundary conditions*

Takeaway: Deal signals are business rules, not UI rules. The service
returns Green/Yellow/Red --- the UI just renders the color.

**Day 24: PropertiesController --- save and retrieve**

Build: Create PropertiesController. POST /api/v1/properties/analyze:
stateless calculation, no database write. POST /api/v1/properties: saves
a property plus runs the analysis. GET /api/v1/properties, PUT
/api/v1/properties/{id}, DELETE /api/v1/properties/{id}.

*Patterns: Stateless calculation endpoint vs. persisting endpoint ---
separation of concerns, re-computing derived values on update*

Takeaway: The stateless /analyze endpoint is valuable: the user can run
deal math without saving anything.

**Day 25: Dual net worth --- liquid vs total with properties**

Build: Update NetWorthService to return both LiquidNetWorth (no
properties) and TotalNetWorth (liquid + property equity). Property
equity = CurrentEstimatedValue - LoanBalance. Update snapshot service to
record both. Test with a saved property.

*Patterns: Extending existing services without breaking callers
(additive response DTO fields), staleness detection logic*

Takeaway: Adding fields to a response DTO is a non-breaking change ---
existing clients that don\'t read the new field are unaffected.

**Day 26: Upload endpoint + profile photo**

Build: Install Azure.Storage.Blobs. Create BlobStorageService
implementing UploadAsync and DeleteAsync. Create UploadController with
POST /api/v1/upload/profile: validates file type (jpg/png/webp only) and
size (max 5MB), uploads to blob, returns URL. Create PUT
/api/v1/users/me for profile update.

*Patterns: Multipart form-data handling in ASP.NET Core, Azure Blob
Storage SDK, content-type validation*

Takeaway: Never store binary files (images) in the database as byte
arrays. Store them in blob/object storage and save only the URL.

**Day 27: Azurite local setup + Integration test day**

Build: Install Azurite (Azure Storage Emulator): npm install -g azurite.
Test the full upload flow locally. Write integration test for
PropertiesController. Verify cap rate, cash flow, and deal signal for a
known set of inputs. Git commit: \'Week 4 complete.\'

*Patterns: Azurite as local Azure Storage emulator, EF Core InMemory
provider for integration tests*

Takeaway: Azurite lets you develop against Azure Storage APIs without
spending money. The code is identical to production --- only the
connection string changes.

**Day 28: Buffer + bug fix + Swagger polish day**

Build: Review all endpoints in Swagger. Fix any issues. Add XML
documentation comments to all controller methods. Verify all
auth-required endpoints return 401 when called without a token. Verify
all soft-deleted records do not appear in GET responses. Git commit:
\'Backend complete.\'

*Patterns: XML doc comments in Swagger, 401 vs 403 (unauthenticated vs
unauthorized), global error handler returning consistent JSON*

Takeaway: A well-documented Swagger makes frontend development
dramatically faster.

**Week 5 --- React Frontend: Auth + River Tab** *\| Goal: React app is
set up, JWT auth works end to end, River tab is fully functional with
real API data.*

**Day 29: React + Vite + TypeScript setup**

Build: Create React app: npm create vite@latest babylon-wealth \--
\--template react-ts. Install dependencies: axios, react-router-dom,
\@tanstack/react-query, recharts, framer-motion, date-fns,
\@tanstack/react-table. Create src/api/client.ts: Axios instance with
baseURL from import.meta.env.VITE_API_BASE_URL, request interceptor
adding Authorization header. Create AuthContext.tsx. Set up React Router
with public and protected routes.

*Patterns: Vite project bootstrap, Axios interceptors, React Context for
auth state, React Router v6 protected routes*

Takeaway: The Axios interceptor is the auth gateway --- every API call
automatically has the JWT attached. One place, one rule.

**Day 30: Login + Register pages**

Build: Create /login page with email/password form. On submit, call POST
/api/v1/auth/login, store returned JWT in AuthContext + localStorage,
redirect to /. Create /register page. Add client-side validation:
password minimum 8 characters, passwords match. Apply the Babylon
gold/dark theme CSS variables.

*Patterns: Controlled form components in React, client-side validation,
redirect on auth success, error state display*

Takeaway: Keep the login page visually on-brand even though it\'s
simple. The Babylon aesthetic should be consistent from the first
screen.

**Day 31: API hooks setup + useNetWorth hook**

Build: Create src/api/netWorthApi.ts. Create src/hooks/useNetWorth.ts
using TanStack Query useQuery: queries getCurrentNetWorth on mount,
caches for 30 seconds. Create src/types/netWorth.ts with TypeScript
interfaces matching the API response DTOs exactly.

*Patterns: TanStack Query useQuery, queryKey design, staleTime
configuration, TypeScript interface alignment with API DTOs*

Takeaway: TanStack Query handles caching, background refetching, and
loading states automatically.

**Day 32: River tab --- net worth display + tier system**

Build: Build the River page. Display net worth from useNetWorth hook.
Implement the TIERS array in constants/tiers.ts (all tiers from -\$70k
scorched to \$100k+ mighty, every \$5k). Write getTier(netWorth) and
getTierProgress(netWorth) utility functions. Render character emoji with
Framer Motion bounce. Render tier label, milestone progress bar,
Arkad\'s advice.

*Patterns: Framer Motion animation variants, conditional rendering based
on computed tier, utility function design for tier logic*

Takeaway: Keep tier logic in a pure utility function (getTier) that
takes a number and returns a tier object. Pure functions are trivially
testable and reusable.

**Day 33: River scene animations --- desert and river SVG**

Build: Build DesertScene component: different SVG landscape per tier
(scorched/cracked earth, dunes, dry riverbed). Build RiverScene
component: animated SVG wave layers with CSS animation, river height
scales with investment percentage, multiple rivers appear above \$100k.

*Patterns: SVG path animations with CSS \@keyframes, conditional
rendering of scene elements per tier, Framer Motion layout animations*

Takeaway: The river animation is the emotional core of the app. The
waves should look like water: layered, slightly offset, different
speeds.

**Day 34: Net worth chart + annotation flags**

Build: Build NetWorthHistoryChart using Recharts AreaChart. Render two
lines: LiquidNetWorth (gold) and TotalNetWorth (blue, only shown if user
has properties). Custom dot renderer: snapshots with annotations render
a flag icon. \'Add Note\' button opens a modal --- calls POST
/api/v1/networth/annotate. On success, invalidates the history query.

*Patterns: Recharts custom dot rendering, Recharts Tooltip
customization, TanStack Query invalidation on mutation*

Takeaway: Query invalidation is the correct pattern after a mutation:
tell TanStack Query \'this data is now stale --- refetch it.\' The chart
automatically shows the new annotation.

**Day 35: Optimal River sub-tab + Week 5 polish**

Build: Build OptimalRiverSubTab --- purely educational, no API calls.
Show the visual model: river (passive income) flows into Lifestyle and
Reinvestment channels. If user has InvestmentIncome data, show their
actual passive income ratio next to the ideal. Git commit: \'Week 5
complete.\'

*Patterns: Educational vs data-driven components, optional data overlay
pattern, mobile-first layout*

Takeaway: The Optimal River sub-tab teaches the principle visually.
Users who are deep in debt need to see the destination they\'re working
toward.

**Week 6 --- Ledger Tab (Spreadsheet UI)** *\| Goal: All account types,
spreadsheet-style table with inline editing, bank logo autocomplete,
totals rows.*

**Day 36: TanStack Table setup + bank search autocomplete**

Build: Install \@tanstack/react-table. Create the LedgerTable base
component: sortable columns, color-coded rows (green assets, red
liabilities), sticky header, bold totals row. Create BankSearchInput
component: text input calling GET /api/v1/banks/search?q={input} as user
types (debounced 300ms), shows dropdown of bank name + logo.

*Patterns: TanStack Table column definitions, debounced API calls
(useCallback + setTimeout), controlled autocomplete component*

Takeaway: Debouncing prevents an API call on every keystroke. Without
it, typing \'chase\' fires 5 requests in 200ms.

**Day 37: Bank accounts section + credit cards section**

Build: Build the Cash Accounts table section: Bank Logo, Label,
Category, Balance, Notes, Edit, Delete. Inline balance editing. Build
the Credit Cards section (personal + business toggle): Bank Logo, Label,
Type, Balance, Limit, APR, Utilization%, Notes.

*Patterns: Inline cell editing state management (editingId state +
optimistic update), conditional section rendering, computed utilization
display*

Takeaway: Optimistic updates: update the UI immediately on user action,
then confirm with the API. If the API fails, roll back.

**Day 38: Loans section + investments section**

Build: Build Loans table: Label, Type, Balance (shown negative),
Interest Rate. Build Investments table: Bank Logo, Label, Type, Value,
Ticker. Verify all balances feed into net worth displayed on the River
tab via shared TanStack Query cache.

*Patterns: Shared query cache across tabs (same queryKey = same data),
negative number display formatting*

Takeaway: TanStack Query\'s cache means adding an investment on the
Ledger tab automatically updates the River tab\'s net worth when you
navigate back.

**Day 39: Pending items section + Notes column**

Build: Build Pending Items section: Description, Counterparty, Amount,
Due Date, Status, Settle button. Settle calls PATCH
/pending/{id}/settle. Build the Notes column: a text input visible on
hover, auto-saves via PUT on blur.

*Patterns: Row-level action buttons (Settle), hover-reveal UI patterns,
blur event for auto-save inputs*

Takeaway: The Notes column auto-saves on blur. No explicit save button
needed. This matches the Excel feel.

**Day 40: Ledger summary panel + mobile layout**

Build: Add a Ledger Summary panel: Total Assets, Total Liabilities,
Total Credit Used, Total Credit Limit, Credit Utilization, Liquid Net
Worth. Ensure the ledger layout is usable on mobile: tables scroll
horizontally, section headings are sticky. Git commit: \'Week 6
complete.\'

*Patterns: Horizontal scroll for tables on mobile, position:sticky for
section headers, bottom sheet modal pattern*

Takeaway: Tables on mobile are always challenging. Horizontal scroll
with sticky first column is the pragmatic choice.

**Week 7 --- Income, Spending & Budget Tabs** *\| Goal: Income entry,
budget category management, spending transaction entry, and all budget
graphs are fully functional.*

**Day 41: Income tab**

Build: Build Income tab. Income sources list with add/edit/delete.
Income Summary panel: annual total, monthly total, Arkad\'s 10% savings
target. Animation: a filling bar showing what percentage of income is
being saved.

*Patterns: Computed display values (annual → monthly in UI), progress
bar animation based on real data ratio*

Takeaway: The 10% savings bar is behavioral design: it shows the user
whether they\'re following Arkad\'s law in real time.

**Day 42: Spending tab --- transaction entry + category management**

Build: Build Spending tab. Budget categories manager: drag-to-reorder,
edit percentage (validates total stays at 100%), custom color picker.
Spending transaction entry: account selector, category selector, amount,
description, date. Transaction list by month.

*Patterns: Drag-to-reorder list, percentage validation on every category
update, month picker for filtered transaction view*

Takeaway: The 100% validation should be enforced both in the UI and in
the API service layer. UI validation is for UX; API validation is for
data integrity.

**Day 43: Spending graphs --- per category + vs income**

Build: Build the budget analytics graph section. Three chart modes: (1)
All Together: overlaid area charts per category vs target; (2) Single
Category: monthly spending trend; (3) Spend vs Earn: total monthly
spending vs total income with gap filled green (saving) or red
(overspending).

*Patterns: Recharts ComposedChart for mixed chart types, reference lines
for budget targets, fill between two lines, chart mode state toggle*

Takeaway: Visualizing the gap between earning and spending is more
powerful than showing either number alone.

**Day 44: Investment Income tab**

Build: Build Investment Income tab. Entry form: source name, type,
amount, date, account. Running totals: this month passive income, annual
passive income. Key ratio panel: Monthly Passive Income vs Monthly
Expenses. 12-month trend bar chart. Git commit: \'Week 7 complete.\'

*Patterns: Multi-month bar chart with Recharts BarChart, ratio
computation and conditional animation trigger*

Takeaway: The passive income ratio is the most important number in the
entire app. When it hits 100%, the user has achieved what Arkad
described as financial freedom.

**Week 8 --- Real Estate Analyzer Tab + Wisdom Tab** *\| Goal: Real
estate deal analyzer fully functional. Wisdom tab complete. App is
feature-complete.*

**Day 45: Real Estate Analyzer --- inputs + loan calculator**

Build: Build Real Estate tab. Input form: purchase price, down payment
linked \$/%, loan type selector (FHA/Conventional/VA/DSCR with
expandable descriptions), interest rate, loan term, property tax,
insurance, HOA, expected rent, vacancy rate, maintenance reserve. Loan
summary panel: monthly P&I, estimated total interest, cash to close.
Call POST /api/v1/properties/analyze on input change (debounced 500ms).

*Patterns: Linked inputs (\$↔% for down payment), debounced live
analysis, expandable info panels for loan type explanations*

Takeaway: Live calculation (no submit button) makes the analyzer feel
like a real financial tool.

**Day 46: Real Estate Analyzer --- metrics + deal signal**

Build: Build the metrics output panel: Monthly Cash Flow (large, color
coded), Annual Cash Flow, Cap Rate, Cash-on-Cash Return, GRM, Break-Even
Rent, DSCR. Deal Signal badge with plain-English explanation.
Amortization table: first 12 months. Info tooltip (?) icons on every
metric.

*Patterns: Conditional color coding based on computed values,
tooltip/popover component for metric definitions*

Takeaway: Every financial metric should have an info tooltip. Removing
jargon friction builds financial literacy.

**Day 47: Saved properties + refinance tracking**

Build: Build Saved Properties list: address, current estimated value,
loan balance, equity, monthly cash flow, deal signal badge. Edit panel
for updating estimated value (with LastValueUpdateDate tracking ---
yellow warning if not updated in 90 days), loan balance, rent. Test
saving, editing, and tracking two properties.

*Patterns: Last-updated staleness warning pattern, refinance event
logging as immutable records*

Takeaway: Staleness warnings are practical --- a subtle \'last updated 4
months ago\' prompt triggers a manual review without being annoying.

**Day 48: Wisdom tab + full app review**

Build: Build Wisdom tab with all Seven Cures of Arkad as rich cards:
icon, cure number, title, ancient parable text, and \'The Practice\'
modern translation. No API calls --- fully static. Review the complete
application for visual consistency. Test all tabs on a narrow mobile
viewport. Git commit: \'Week 8 complete --- app feature-complete.\'

*Patterns: Static content as React constants (no API needed), design
system consistency audit, CSS clamp() for responsive font sizes*

Takeaway: Static content like the Wisdom tab should never hit an API.
Databases are for dynamic data.

**Week 9 --- Profile, Polish, Bank Logos, Final Features** *\| Goal:
Profile photo upload works, bank logos display correctly, all edge cases
handled, app feels complete.*

**Day 49: Profile page + photo upload**

Build: Build Profile page: display name, email, profile photo (circular,
80px). Upload photo: triggers file picker (jpg/png/webp only, max 5MB),
previews the selected image, calls POST /api/v1/upload/profile, updates
profile via PUT /api/v1/users/me. Logout button clears JWT.

*Patterns: File input with client-side validation (type + size before
upload), URL.createObjectURL for local preview, multipart/form-data
Axios request*

Takeaway: Client-side file validation prevents bad uploads before they
reach the API. Fail fast, fail locally, with a clear error message.

**Day 50: Bank logo display audit + placeholder logos**

Build: Verify bank logos display correctly in the Ledger tab across all
account types. For any bank without a real logo URL, create simple SVG
placeholder logos with the bank\'s initials. Upload to Azurite. Test
that all 40 banks show a logo in the autocomplete. Edge case: if a logo
URL is broken, show a fallback initial-letter avatar.

*Patterns: SVG generation in Node.js, fallback image handling in React
(onError event), Azurite container/blob URL structure*

Takeaway: Always handle broken image URLs gracefully. A broken \<img\>
renders a broken icon --- worse than no image.

**Day 51: Edge cases + error handling audit**

Build: Systematically test error states: no accounts (empty state with
call-to-action), API offline (friendly toast notification, not a white
screen), token expired (interceptor catches 401, redirects to login),
form validation errors (inline field-level messages), zero income
(placeholder in budget tab).

*Patterns: Empty state design, toast notification system (react-toastify
or custom), Axios response interceptor for 401 handling*

Takeaway: Empty states are part of the user experience. \'No accounts
yet --- add your first account to start tracking your river\' is
welcoming and actionable.

**Day 52: Net worth history chart --- full polish**

Build: Add date range selector (3M / 6M / 1Y / All time). Add a data
table below the chart showing each snapshot date, liquid NW, total NW,
annotation text. Add Export CSV button. Mobile: chart should be
touch-scrollable with a crosshair on touch. Git commit: \'Week 9
polish.\'

*Patterns: Recharts reference area for date range highlight, CSV export
via Blob + URL.createObjectURL, touch event handling in Recharts*

Takeaway: CSV export is a power-user feature that takes one afternoon
and provides significant value --- users get ownership of their own
data.

**Week 10 --- Testing, Final Polish, Deployment** *\| Goal: All tests
pass, the app deploys cleanly to Railway, and documentation is
complete.*

**Day 53: Complete xUnit test suite**

Build: Write any remaining unit tests. Target: NetWorthService (8
tests), BudgetAnalyticsService (6 tests), PropertyAnalyzerService (12
tests), SnapshotService (3 tests). Run all tests: dotnet test. All must
pass. Fix any failures.

*Patterns: Test coverage analysis, fixing tests that depend on internal
implementation details, test naming conventions
(\[Method_Scenario_ExpectedResult\])*

Takeaway: Test naming convention:
NetWorthService_WithActiveAndDeletedAccounts_ExcludesDeletedFromSum.
This reads like a specification.

**Day 54: Railway deployment --- API + PostgreSQL**

Build: Follow the Railway Deployment Guide. Add Dockerfile to solution
root. Configure Railway environment variables (DATABASE_URL
auto-injected from linked PostgreSQL service, JWT\_\_SecretKey,
ASPNETCORE_URLS=http://+:8080, ASPNETCORE_ENVIRONMENT=Production). Add
auto-migrate code to Program.cs before app.Run(). Push to main ---
Railway builds and deploys. Verify Swagger is accessible at the Railway
URL. Verify bank seeder ran.

*Patterns: Dockerfile multi-stage build for .NET, EF Core auto-migrate
on startup (idempotent), Railway environment variable injection*

Takeaway: Auto-migration (db.Database.Migrate()) is safe to run on every
startup --- EF Core skips already-applied migrations.

**Day 55: Vercel deployment --- React frontend**

Build: Deploy React to Vercel: connect GitHub repo, set Root Directory
to React folder, add VITE_API_BASE_URL environment variable pointing to
the Railway API URL. Add vercel.json rewrite rule for React Router.
Verify the app loads at the Vercel URL. Update FRONTEND_URL in Railway
environment variables so CORS allows the Vercel domain. Run full
end-to-end test: register, add account, check River tab.

*Patterns: Vercel static deployment, VITE\_ prefixed environment
variables in Vite, vercel.json rewrite for SPA routing, CORS allowed
origins update*

Takeaway: The CORS update is the most commonly missed step. Railway must
know your Vercel URL before the frontend can talk to the API.

**Day 56: README + roadmap + final review**

Build: Write README.md: Prerequisites, running locally (two terminals),
first-time setup, how snapshots work, how to run tests. Write ROADMAP.md
with future features: bank API integration (Plaid), multi-currency
support, shared access, mobile native app, custom domain. Full visual
review --- screenshot each tab. Git commit: \'v1.0 --- Babylon Wealth
complete.\' Tag the commit: git tag v1.0.0 && git push \--tags.

*Patterns: Semantic versioning, git tagging, roadmap documentation as
living document*

Takeaway: Tagging v1.0.0 in git creates a permanent reference point.
Everything after this is v1.1, v1.2, v2.0. The roadmap transforms \'this
is done\' into \'this is the foundation.\'

**10. Database --- PostgreSQL**

Babylon Wealth uses PostgreSQL from day one. There is no SQLite phase
and no future migration --- the database is production-ready from the
start.

**Local Development Setup**

- Install PostgreSQL locally (PostgreSQL 15+ recommended). macOS: brew
  install postgresql@15. Windows: download from postgresql.org.

- Create a local database: createdb babylonwealth

- Set the connection string in appsettings.Development.json:

\"DefaultConnection\":
\"Host=localhost;Database=babylonwealth;Username=postgres;Password=yourpassword\"

- Run dotnet ef database update from the Infrastructure project to apply
  all migrations.

**Production (Railway)**

Railway provisions a managed PostgreSQL instance automatically. The
DATABASE_URL environment variable is injected directly into the API
container. No manual connection string management is needed in
production --- the app reads DATABASE_URL from the environment.

**PostgreSQL-Specific Features Used**

- jsonb columns --- used for CustomFields on every entity. Native
  PostgreSQL JSON type enables efficient key-value storage without
  schema changes.

- Full-text search --- available for future bank name searching via
  pg_trgm extension if needed.

- Native enum support --- currently using string-based enums in EF Core
  for portability, but PostgreSQL native enums are available as a future
  optimization.

**EF Core Npgsql Configuration**

Install: dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL

Register in DI: options.UseNpgsql(connectionString)

CustomFields jsonb column: entity.Property(e =\>
e.CustomFields).HasColumnType(\"jsonb\")

**11. Deployment Options**

All options below assume PostgreSQL is already in use (which it is from
day one in this build plan).

  ---------------- -------------- ------------- -------------------------------
  **Option**       **Cost**       **Effort**    **Notes**

  Railway          Free tier /    Low           Best for personal use. Hosts
  (recommended)    \~\$5/mo                     .NET API + managed PostgreSQL
                                                in one project. Deploy from
                                                GitHub. Biweekly snapshot runs
                                                24/7.

  Fly.io           Free /         Low-Medium    Generous free tier. Native
                   \~\$3/mo                     Docker support. PostgreSQL
                                                available. Good .NET support.

  Render           Free / \$7/mo  Low           Frontend on free tier (sleeps
                   DB                           after 15 min). API and DB paid
                                                after trial.

  Vercel + Railway \~\$5/mo       Medium        Recommended split: Vercel for
                                                React (free, fast CDN), Railway
                                                for API + PostgreSQL.

  Azure            \~\$15-25/mo   Medium-High   App Service + Azure
                                                PostgreSQL + Blob Storage + Key
                                                Vault. Production-grade.
  ---------------- -------------- ------------- -------------------------------

**Deployment Steps (Railway)**

See the Babylon Wealth Railway Deployment Guide document for the full
day-by-day deployment plan. High-level steps:

1.  Add Dockerfile to solution root

2.  Create Railway project, attach PostgreSQL service

3.  Set environment variables (JWT\_\_SecretKey, ASPNETCORE_URLS,
    FRONTEND_URL)

4.  Add auto-migrate code to Program.cs before app.Run()

5.  Push to main --- Railway builds and deploys automatically

6.  Deploy React to Vercel with VITE_API_BASE_URL pointing to Railway
    URL

***✦ A part of all you earn is yours to keep. ✦***

Babylon Wealth --- Personal Finance, Built with Intention.
