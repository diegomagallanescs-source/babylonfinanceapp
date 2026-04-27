# Babylon Wealth — App Architecture & Six-Page Spec

> Reference document covering all statement analysis endpoints, architecture changes introduced
> during the PDF import build, and the full spec for each of the six application pages.

---

## Table of Contents

1. [Architecture Changes](#1-architecture-changes)
2. [Full API Reference](#2-full-api-reference)
3. [Frontend Route Map](#3-frontend-route-map)
4. [Page Specs](#4-page-specs)
   - [4.1 Home (River)](#41-home-river)
   - [4.2 Accounting](#42-accounting)
   - [4.3 Money In](#43-money-in)
   - [4.4 Money Out](#44-money-out)
   - [4.5 Investing](#45-investing)
   - [4.6 Real Estate Analyzer](#46-real-estate-analyzer)
5. [Shared Components](#5-shared-components)
   - [5.1 CumulativeTransactionView](#51-cumulativetransactionview)

---

## 1. Architecture Changes

### 1.1 New Entities

| Entity | Table | Purpose |
|---|---|---|
| `StatementImport` | `StatementImports` | Monthly credit-card spend totals saved by the user for chart history |
| `CheckingStatementImport` | `CheckingStatementImports` | Monthly checking account Money In / Money Out totals |

Both entities extend `BaseEntity<Guid>` (soft-delete, `CreatedAt`, `UpdatedAt`).

```
CheckingStatementImport
├── UserId (FK → AspNetUsers)
├── Month (int)
├── Year (int)
├── TotalMoneyIn (decimal 18,2)
├── TotalMoneyOut (decimal 18,2)
├── TransactionCount (int)
├── AccountsIncluded (varchar 200)
└── Notes (varchar 500, nullable)
```

Index: `(UserId, Year, Month)` — optimises the history and annual-summary queries.

### 1.2 New Services

```
BabylonWealth.Core / Interfaces / Services
├── IStatementAnalyzerService          (existing — credit card PDF analysis)
├── ICheckingStatementAnalyzerService  (NEW — Chase / SoFi / BofA PDF analysis)
├── IStatementImportService            (existing — credit card save/history)
└── ICheckingStatementImportService    (NEW — checking save/history/annual)

BabylonWealth.Services
├── StatementAnalyzerService           (existing)
├── CheckingStatementAnalyzerService   (NEW)
├── StatementImportService             (existing)
└── CheckingStatementImportService     (NEW)
```

### 1.3 PDF Parser — Format Auto-Detection

`CheckingStatementAnalyzerService.ParseSinglePdf` reads the first 40 lines and routes to one of three parsers:

```
First 40 lines contain "SoFi" or "sofi.com"  →  ParseSoFiChecking
First 40 lines contain "Bank of America"       →  ParseBofAChecking
Default                                         →  ParseChaseChecking
```

**Supported formats (checking):**

| Bank | Date format | Section markers |
|---|---|---|
| Chase Checking | `MM/DD` | `*start*transaction detail` … `*end*transaction detail` |
| SoFi Checking | `Mon DD, YYYY` | `Checking Account - XXXX` header; stop at `Savings Account` |
| Bank of America | `MM/DD/YY` | Section headers: `Deposits and other additions` / `Withdrawals and other subtractions` / `Service fees` |

**Self-transfer filter:** Any inbound Zelle transaction whose description matches `\bDIEGO\b` is re-tagged as `"Self Transfer"` and excluded from `TotalMoneyIn`. This prevents inter-account movements from inflating income figures. The transaction still appears in the full list for transparency.

### 1.4 Money In / Money Out Categories

**Money In**

| Category | Triggers |
|---|---|
| Payroll | `PAYROLL`, `SALARY`, `WAGES`, `STAREDLA`, `DIRECT DEPOSIT` |
| Zelle Received | `ZELLE` + `FROM` |
| Business / Freelance | `WIX`, `PAYPAL`, `STRIPE`, `VENMO`, `SQUARE` |
| Refund / Credit | `REFUND`, `CREDIT REFUND`, `TEMPORARY CREDIT`, `ADJUSTMENT` |
| Interest | `INTEREST` |
| Transfer In | `SOFI`, `REMOTE ONLINE DEPOSIT`, `PL DISB`, `WIRE`, `ACH CREDIT` |
| Self Transfer | Zelle + `DIEGO` in description — excluded from totals |
| Other Income | fallback |

**Money Out**

| Category | Triggers |
|---|---|
| Credit Card Payment | `AMERICAN EXPRESS`, `AMEX`, `CARDMEMBER SERV`, `CHASE CARD`, `APPLECARD`, `DISCOVER`, `CITI`, `CAPITAL ONE` |
| Investing | `AMERITRADE`, `SCHWAB`, `FIDELITY`, `VANGUARD`, `ETRADE`, `ROBINHOOD`, `WEBULL`, `WEALTHFRONT`, `BETTERMENT`, `ACORNS`, `SOFI INVEST`, `M1 FINANCE`, `CHASE INVEST`, `MERRILL`, `INTERACTIVE BROKER` |
| Zelle Sent | `ZELLE` + `TO` |
| ATM / Cash | `ATM WITHDRAWAL`, `WITHDRWL`, `CASH WD` |
| Taxes | `IRS`, `USATAXPYMT`, `FRANCHISE TAX`, `STATE TAX` |
| Debit Card Purchase | `CHECKCARD`, `DEBIT CARD PURCHASE` |
| Bank Transfer | `WIRE TRANSFER`, `WISE`, `ACH TRANSFER` |
| Service Fee | BofA service-fee section |
| Other Payment | fallback |

### 1.5 Migrations Applied

```
20260427124932_AddStatementImports           (StatementImports table)
20260427140023_AddCheckingStatementImports   (CheckingStatementImports table)
```

To apply on a fresh database:
```bash
dotnet ef database update --project BabylonWealth.Infrastructure --startup-project BabylonWealth.API
```

---

## 2. Full API Reference

All routes are under `/api/v1/`. All require `Authorization: Bearer <token>` except `/auth/*`.

### 2.1 Credit Card Statement Analysis

#### `POST /statements/analyze`
Stateless — accepts any number of credit card PDF files. Returns pooled spending analysis. Nothing is written to the database.

**Content-Type:** `multipart/form-data`  
**Body:** one or more PDF files under the key `files`  
**Size limit:** 50 MB total

**Response: `StatementAnalysisResponseDto`**
```json
{
  "statementPeriod": "March 2026",
  "reportType": "Monthly",
  "inferredMonth": 3,
  "inferredYear": 2026,
  "accountsDetected": ["2271", "41007"],
  "totalPurchases": 9970.46,
  "transactionCount": 231,
  "hasTransactions": true,
  "transactions": [
    { "date": "03/01", "description": "AMAZON MARKETPLACE", "amount": 18.31, "category": "Amazon", "accountLast4": "41007" }
  ],
  "categoryBreakdown": [
    { "category": "Shopping", "total": 1123.61, "count": 23, "percentage": 11.3 }
  ],
  "topMerchants": [
    { "name": "Amazon", "total": 737.59, "count": 28 }
  ],
  "monthlyBreakdown": [
    { "month": 3, "monthName": "March", "total": 9970.46, "count": 231 }
  ],
  "parseWarnings": []
}
```

`reportType` is `"Monthly"` for a single-month statement or `"YearEnd"` when a full-year spending report is uploaded. `monthlyBreakdown` has one entry per calendar month for year-end reports (all 12 months).

#### `POST /statements/save`
Persists the monthly credit-card spend total to the database for the chart history.

**Body:**
```json
{
  "month": 3,
  "year": 2026,
  "totalSpend": 9970.46,
  "transactionCount": 231,
  "accountsIncluded": "2271, 41007",
  "notes": "March combined"
}
```

**Response: `StatementSummaryResponseDto`** — the saved record with its `id`.

#### `GET /statements/history`
Returns all saved monthly credit-card summaries ordered by year/month ascending. Used to power the Money Out over-time chart.

**Response:** array of `StatementSummaryResponseDto`

#### `DELETE /statements/{id}`
Soft-deletes a saved monthly credit-card summary.

---

### 2.2 Checking Account Statement Analysis

#### `POST /statements/analyze-checking`
Stateless — accepts any number of checking account PDF files (Chase, SoFi, BofA auto-detected). Returns pooled Money In / Money Out analysis. Nothing is written to the database. Self-Zelle transfers are excluded from `TotalMoneyIn`.

**Content-Type:** `multipart/form-data`  
**Body:** one or more PDF files under the key `files`  
**Size limit:** 50 MB total

**Response: `CheckingStatementResponseDto`**
```json
{
  "statementPeriod": "March 17, 2026 – April 15, 2026 + Mar 1, 2026 – Mar 31, 2026",
  "inferredMonth": 3,
  "inferredYear": 2026,
  "accountsDetected": ["0698", "1820", "2685"],
  "totalMoneyIn": 18177.06,
  "totalMoneyOut": 23072.70,
  "netFlow": -4895.64,
  "transactionCount": 76,
  "transactions": [
    {
      "date": "03/30/2026",
      "description": "81285 STAREDLA PAYROLL",
      "amount": 488.81,
      "direction": "In",
      "category": "Payroll",
      "accountLast4": "1820",
      "sourceFile": "sofi-checking.pdf"
    }
  ],
  "moneyInBreakdown": [
    { "category": "Payroll", "total": 1925.12, "count": 3, "percentage": 10.6 }
  ],
  "moneyOutBreakdown": [
    { "category": "Credit Card Payment", "total": 11148.74, "count": 33, "percentage": 48.3 }
  ],
  "parseWarnings": []
}
```

#### `POST /statements/checking/save`
Persists a monthly checking summary to the database.

**Body:**
```json
{
  "month": 3,
  "year": 2026,
  "totalMoneyIn": 18177.06,
  "totalMoneyOut": 23072.70,
  "transactionCount": 76,
  "accountsIncluded": "0698, 1820, 2685",
  "notes": "March all checking"
}
```

**Response: `CheckingStatementSummaryDto`**
```json
{
  "id": "3ecca0ff-...",
  "month": 3,
  "year": 2026,
  "totalMoneyIn": 18177.06,
  "totalMoneyOut": 23072.70,
  "netFlow": -4895.64,
  "transactionCount": 76,
  "accountsIncluded": "0698, 1820, 2685",
  "notes": null,
  "createdAt": "2026-04-27T00:00:00Z"
}
```

#### `GET /statements/checking/history`
Returns all saved monthly checking summaries ordered by year/month ascending. Used to power the Money In over-time chart.

**Response:** array of `CheckingStatementSummaryDto`

#### `DELETE /statements/checking/{id}`
Soft-deletes a saved checking monthly summary.

---

### 2.3 Annual Financial Summary

#### `GET /statements/annual-summary`
Aggregates saved checking and credit-card history by calendar year. No DB writes — computed on read from existing saved records.

**Response:** array of `AnnualFinancialSummaryDto`
```json
[
  {
    "year": 2025,
    "totalMoneyIn": 87000.00,
    "totalCheckingOut": 62000.00,
    "totalCreditCardSpend": 42000.00,
    "netSavings": 45000.00,
    "checkingMonthsRecorded": 12,
    "creditCardMonthsRecorded": 12
  },
  {
    "year": 2026,
    "totalMoneyIn": 18177.06,
    "totalCheckingOut": 23072.70,
    "totalCreditCardSpend": 4434.78,
    "netSavings": 13742.28,
    "checkingMonthsRecorded": 1,
    "creditCardMonthsRecorded": 1
  }
]
```

`netSavings = totalMoneyIn - totalCreditCardSpend` — real money not spent on purchases.

---

### 2.4 Real Estate

#### `POST /properties/analyze`
Stateless deal analyzer — no database write.

**Body:** `PropertyAnalysisRequest` (purchase price, rent, expenses, loan terms, etc.)

**Response:** `PropertyAnalysisResponseDto` — all deal metrics (cap rate, cash-on-cash, DSCR, etc.)

#### `GET /properties`, `POST /properties`, `PUT /properties/{id}`, `DELETE /properties/{id}`
Full CRUD for saved properties displayed in the Accounting tab.

---

## 3. Frontend Route Map

```
/                    →  Home (River)
/accounting          →  Accounting — manual ledger + properties
/money-in            →  Money In — checking PDF import + charts
/money-out           →  Money Out — credit card PDF import + charts
/investing           →  Investing — portfolio tracker + projections
/real-estate         →  Real Estate Analyzer — deal calculator
```

### Data Hooks Required

```ts
// Existing
useNetWorth()            // GET /networth/current
useAccounts()            // GET /accounts
useCreditCards()         // GET /creditcards
useLoans()               // GET /loans
useInvestments()         // GET /investments
usePendingItems()        // GET /pending
useProperties()          // GET /properties
useIncome()              // GET /income
usePassiveIncome()       // GET /investmentincome/summary
useBudgetCategories()    // GET /budget/categories

// New — Money In page
useCheckingHistory()     // GET /statements/checking/history
useAnalyzeChecking()     // POST /statements/analyze-checking (mutation)
useSaveChecking()        // POST /statements/checking/save (mutation)
useDeleteChecking()      // DELETE /statements/checking/{id} (mutation)

// New — Money Out page
useStatementHistory()    // GET /statements/history
useAnalyzeStatement()    // POST /statements/analyze (mutation)
useSaveStatement()       // POST /statements/save (mutation)
useDeleteStatement()     // DELETE /statements/{id} (mutation)

// New — Annual summary (both pages + Home)
useAnnualSummary()       // GET /statements/annual-summary
```

---

## 4. Page Specs

---

### 4.1 Home (River)

**Route:** `/`  
**Data:** `useNetWorth()`, `useNetWorthHistory()`, `useAnnualSummary()`  
**Input:** None (read-only)

No structural changes to this page. The `useAnnualSummary` hook can optionally surface a callout like "Your river grew $X last year" below the NW chart.

Existing component tree and river animation remain unchanged — see `docs/home-screen-spec.md`.

---

### 4.2 Accounting

**Route:** `/accounting`  
**Purpose:** Central manual-entry ledger for every financial position. All inputs are forms — no PDF upload here.  
**Data:** all account/card/loan/investment/pending/property hooks

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  ACCOUNTING                              [+ Add Account] │
├──────────────┬──────────────────────────────────────────┤
│  Side tabs   │  Content panel                           │
│              │                                          │
│  Bank Accts  │  Table of records for selected tab       │
│  Credit Cards│  Each row: key fields + Edit / Delete    │
│  Loans       │  [+ Add] button at bottom of each table  │
│  Investments │                                          │
│  Pending     │                                          │
│  Properties  │                                          │
└──────────────┴──────────────────────────────────────────┘
```

#### Tabs

| Tab | Entity | Key columns shown |
|---|---|---|
| Bank Accounts | `BankAccount` | Bank logo, label, type, balance |
| Credit Cards | `CreditCard` | Bank logo, label, balance, limit, APR |
| Loans | `Loan` | Label, lender, balance, interest rate, type |
| Investments | `Investment` | Bank logo, label, current value, ticker, type |
| Pending | `PendingItem` | Description, counterparty, amount, due date, status |
| Properties | `Property` | Address, purchase price, estimated value, equity |

#### Properties sub-panel

Properties are displayed as cards (not a table) because of their richer data:

```
┌────────────────────────────────────────┐
│  123 Main St, Chino Hills CA           │
│  Purchase: $450,000  Est: $520,000     │
│  Loan: $380,000  Equity: $140,000      │
│  Rent: $2,800/mo  Expenses: $1,200/mo  │
│  Cash Flow: $+1,600/mo                 │
│                    [Edit]  [Analyze]   │
└────────────────────────────────────────┘
```

"Analyze" opens the stateless deal calculator pre-filled with the property's numbers.

#### Net Worth contribution callout

At the top of the Accounting tab, show a read-only summary bar:

```
Assets: $XXX,XXX  |  Liabilities: $XXX,XXX  |  Net Worth: $XXX,XXX
```

This is derived from `useNetWorth()` — no extra API call needed.

---

### 4.3 Money In

**Route:** `/money-in`  
**Purpose:** Upload checking account PDFs, view income breakdown, and save monthly totals to build a history chart.  
**Data:** `useCheckingHistory()`, `useAnnualSummary()`  
**Input:** PDF file upload (Chase, SoFi, BofA auto-detected)

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  MONEY IN                                               │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐   │
│  │  Drop checking statement PDFs here               │   │
│  │  (Chase, SoFi, Bank of America — any mix)        │   │
│  │  [Browse files]         [Analyze →]              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ── Analysis Results (after upload) ──────────────────  │
│                                                         │
│  Period: March 2026    Accounts: 0698, 1820, 2685       │
│                                                         │
│  ┌──────────────────┐  ┌────────────────────────────┐   │
│  │ Total Money In   │  │ Breakdown Donut Chart       │   │
│  │ $18,177          │  │  Payroll 10.6%              │   │
│  │                  │  │  Zelle Received 64.3%       │   │
│  │ Total Money Out  │  │  Business/Freelance 2.1%    │   │
│  │ $23,072          │  │  ...                        │   │
│  │                  │  └────────────────────────────┘   │
│  │ Net Flow         │                                   │
│  │ -$4,895          │                                   │
│  └──────────────────┘                                   │
│                                                         │
│  ── Cumulative Transaction View ───────────────────── │
│  [All] [Payroll] [Zelle Received] [Credit Card Pymt]   │
│  (category filter pills — click any to drill in)       │
│                                                         │
│  Date        Dir  Description              Amount       │
│  03/30/2026  In   STAREDLA PAYROLL         +$488.81     │
│  03/28/2026  In   Zelle from John          +$500.00     │
│  03/25/2026  Out  CHASE CARD SERVICES      -$3,500.00   │
│  ...                                                    │
│                                                         │
│  (if year-end upload: add Month filter row above pills) │
│                                                         │
│                [Export to PDF]  [Save This Month →]     │
│                                                         │
│  ── Monthly History Chart ─────────────────────────── │
│  (Area chart — Money In per month from saved records)  │
│                                                         │
│  ── Annual Summary Table ──────────────────────────── │
│  Year  │ Money In  │ Months Recorded                   │
│  2025  │ $87,000   │ 12                                │
│  2026  │ $18,177   │ 1                                 │
└─────────────────────────────────────────────────────────┘
```

#### Components

```
<MoneyInPage>
  ├── <PdfDropZone onAnalyze={handleAnalyze} />
  ├── <CheckingResultsPanel result={analysisResult}>
  │     ├── <MoneyFlowSummaryCards />          // In / Out / Net Flow KPI cards
  │     ├── <MoneyInDonutChart />              // Recharts PieChart
  │     ├── <CumulativeTransactionView        // see §5.1
  │     │     transactions={result.transactions}
  │     │     breakdown={result.moneyInBreakdown}
  │     │     title="Money In — March 2026"
  │     │     showMonthFilter={isYearEnd}
  │     │   />
  │     └── <SaveMonthButton onSave={handleSave} />
  └── <MoneyInHistorySection>
        ├── <MoneyInAreaChart />               // Recharts AreaChart from saved history
        └── <AnnualSummaryTable />             // from useAnnualSummary()
```

#### Chart: Money In History (Area Chart)

- **X-axis:** `Jan 25, Feb 25, ... Mar 26` (month/year labels)
- **Y-axis:** dollar amount
- **Series:** single gold-tinted area — `TotalMoneyIn` per month
- **Data source:** `useCheckingHistory()` → `CheckingStatementSummaryDto[]`
- **Tooltip:** month name, money in amount, net flow

#### Save flow

1. User uploads PDFs → `POST /statements/analyze-checking` → results shown
2. User reviews results → clicks "Save This Month"
3. Frontend calls `POST /statements/checking/save` with `{ month, year, totalMoneyIn, totalMoneyOut, transactionCount, accountsIncluded }`
4. `queryClient.invalidateQueries(['checking-history'])` → chart updates
5. Toast: "March 2026 saved ✓"

---

### 4.4 Money Out

**Route:** `/money-out`  
**Purpose:** Upload credit card PDF statements, view spending breakdown, and save monthly totals to build a spend history chart.  
**Data:** `useStatementHistory()`, `useAnnualSummary()`  
**Input:** PDF file upload (Chase credit, Amex monthly, Amex year-end, Chase year-end spending report — all auto-detected)

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  MONEY OUT                                              │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐   │
│  │  Drop credit card statement PDFs here            │   │
│  │  (Chase, Amex monthly or year-end)               │   │
│  │  [Browse files]         [Analyze →]              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ── Analysis Results ─────────────────────────────────  │
│                                                         │
│  Period: March 2026    Accounts: 2271, 41007            │
│  Report: Monthly                                        │
│                                                         │
│  Total Spend: $9,970                                    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Spending Breakdown (horizontal bar chart)       │   │
│  │  Amazon          $737  ████████░░  16.6%         │   │
│  │  Shopping        $1,123 ██████████  25.3%         │   │
│  │  Dining          $458  ████░░░░░░  10.3%          │   │
│  │  ...                                             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ── Top Merchants ─────────────────────────────────── │
│  Amazon                 $737   28 txns                  │
│  Online Shopping        $1,050  22 txns                 │
│  ...                                                    │
│                                                         │
│  ── If Year-End: Monthly Breakdown ─────────────────── │
│  (Bar chart — one bar per month, Jan–Dec)               │
│                                                         │
│  ── Cumulative Transaction View ───────────────────── │
│  [All] [Amazon] [Shopping] [Dining] [Travel] [...]     │
│  (category filter pills — click any to drill in)       │
│                                                         │
│  Date   Description                     Amount         │
│  03/01  AMAZON MARKETPLACE              $18.31         │
│  03/02  UBER EATS                       $42.50         │
│  ...                                                    │
│                                                         │
│  (year-end: Month filter row above category pills)      │
│                                                         │
│               [Export to PDF]  [Save This Month →]     │
│                                                         │
│  ── Spend History Chart ───────────────────────────── │
│  (Area chart — TotalSpend per month from saved records) │
│                                                         │
│  ── Annual Summary Table ──────────────────────────── │
│  Year  │ Credit Card Spend │ Money In  │ Net Savings   │
│  2025  │ $42,000           │ $87,000   │ $45,000       │
│  2026  │ $4,434            │ $18,177   │ $13,742       │
└─────────────────────────────────────────────────────────┘
```

#### Components

```
<MoneyOutPage>
  ├── <PdfDropZone onAnalyze={handleAnalyze} />
  ├── <StatementResultsPanel result={analysisResult}>
  │     ├── <SpendSummaryCard />                // total + period + report type badge
  │     ├── <CategoryBarChart />                // Recharts horizontal BarChart
  │     ├── <TopMerchantsTable />
  │     ├── <MonthlyBreakdownBarChart />        // visible only if reportType === "YearEnd"
  │     ├── <CumulativeTransactionView         // see §5.1
  │     │     transactions={result.transactions}
  │     │     breakdown={result.categoryBreakdown}
  │     │     title={`Purchases — ${result.statementPeriod}`}
  │     │     showMonthFilter={result.reportType === 'YearEnd'}
  │     │   />
  │     └── <SaveMonthButton onSave={handleSave} />
  └── <MoneyOutHistorySection>
        ├── <SpendHistoryAreaChart />           // from useStatementHistory()
        └── <AnnualSummaryTable />              // from useAnnualSummary()
```

#### Chart: Spend History (Area Chart)

- **X-axis:** month/year
- **Y-axis:** dollar amount
- **Series:** red/amber area — `TotalSpend` per month
- **Data source:** `useStatementHistory()` → `StatementSummaryResponseDto[]`
- **Tooltip:** month, spend amount

#### Year-End report handling

When `reportType === "YearEnd"`, the `monthlyBreakdown` array has one entry per month. Render a grouped bar chart instead of the regular category chart:

```
         Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec
Spend    ████ ████ ████ ████ ████ ████ ████ ████ ████ ████ ████ ████
```

On save, prompt the user: "This is a full year — save all 12 months?" and loop through `monthlyBreakdown` calling `POST /statements/save` for each month.

---

### 4.5 Investing

**Route:** `/investing`  
**Purpose:** Track all investment accounts, log monthly contributions, and visualise portfolio compound growth over time.  
**Data:** `useInvestments()`, `usePassiveIncome()`, `useNetWorthHistory()`  
**Input:** Manual — no PDF upload

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  INVESTING                                              │
├─────────────────────────────────────────────────────────┤
│  ── Portfolio Summary ─────────────────────────────── │
│                                                         │
│  Total Portfolio Value: $XXX,XXX                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │  401(k)  │ │  Roth IRA│ │  Schwab  │               │
│  │ $XX,XXX  │ │ $XX,XXX  │ │ $XX,XXX  │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│                                                         │
│  ── Portfolio Value Over Time ─────────────────────── │
│  (Area chart — cumulative investment value per snapshot)│
│  ┌──────────────────────────────────────────────────┐   │
│  │    $                                    ╱╱╱      │   │
│  │    ╱                                  ╱╱         │   │
│  │  ╱╱                               ╱╱╱            │   │
│  │ ─────────────────────────────────────────────── │   │
│  │  Jan '25                              Apr '26    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ── My Monthly Contributions Table ───────────────── │
│  Account          │ Monthly Contrib │ Type            │
│  Schwab           │ $500            │ Brokerage       │
│  401(k)           │ $800            │ Employer Match  │
│  Roth IRA         │ $583            │ Roth IRA        │
│  Total/month:     │ $1,883          │                 │
│                            [+ Add / Edit Accounts]    │
│                                                         │
│  ── Compound Growth Projector ─────────────────────── │
│  Monthly contribution: $1,883  (auto-filled from above) │
│  Expected annual return: [7%]  Time horizon: [30 years] │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Projection to 2056                             │   │
│  │  ╱ Total value (contributions + growth)          │   │
│  │ ╱   Personal contributions only                  │   │
│  │─────────────────────────────────────────────────│   │
│  │  In 30 years: $1,895,000  (Personal: $677,880)  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ── Passive Income ─────────────────────────────────── │
│  Last 12 months dividends / interest: $XXX             │
│  (links to Investment Income tab records)              │
└─────────────────────────────────────────────────────────┘
```

#### Components

```
<InvestingPage>
  ├── <PortfolioSummaryBar />             // total + per-account cards
  ├── <PortfolioValueChart />             // multi-line or area Recharts chart
  │     // X = snapshot dates from useNetWorthHistory()
  │     // Y = sum of investment current values (filter from history snapshots)
  ├── <MonthlyContributionsTable>
  │     ├── rows from useInvestments() — each row: account name, type
  │     └── user edits monthly contribution amount per account (stored client-side
  │         or add a `MonthlyContribution` field to the Investment entity)
  ├── <CompoundGrowthProjector>
  │     ├── inputs: monthly total contribution, annual rate (%), years
  │     └── <ProjectionDualLineChart />   // two series: total vs contributions-only
  └── <PassiveIncomeSummary />            // from usePassiveIncome()
```

#### Compound Growth Calculation (frontend, no API needed)

```ts
function projectGrowth(monthly: number, annualRate: number, years: number) {
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  const data = [];
  let value = 0;
  let contributed = 0;

  for (let m = 0; m <= months; m++) {
    value = value * (1 + monthlyRate) + monthly;
    contributed += monthly;
    if (m % 12 === 0) {
      data.push({ year: m / 12, totalValue: Math.round(value), contributed: Math.round(contributed) });
    }
  }
  return data;
}
```

#### Backend consideration for contributions

The existing `Investment` entity stores `CurrentValue` and `Ticker` but not a monthly contribution amount. Two options:

1. **Add a `MonthlyContribution` column** to `Investment` via an additive migration — simplest path.
2. **Store contributions client-side** in `localStorage` — no migration needed, zero persistence risk. Good for MVP.

Recommendation: start with option 2 for the projector (it's a calculator, not financial record-keeping). Add the column later if the user wants cross-device sync.

---

### 4.6 Real Estate Analyzer

**Route:** `/real-estate`  
**Purpose:** Run stateless deal analysis on prospective or existing properties and save the results.  
**Data:** `useProperties()`  
**Input:** Manual form fields — no PDF

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  REAL ESTATE ANALYZER                                   │
├─────────────────────────────────────────────────────────┤
│  ── Deal Calculator ───────────────────────────────── │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  PROPERTY DETAILS                                │   │
│  │  Address: [________________]                     │   │
│  │  Purchase Price:   [$_______]                    │   │
│  │  Down Payment:     [$_______]   [  %]            │   │
│  │  Interest Rate:    [_.__%]  Term: [30] years     │   │
│  │  Monthly Rent:     [$_______]                    │   │
│  │  HOA:              [$_______]                    │   │
│  │  Property Tax/mo:  [$_______]                    │   │
│  │  Insurance/mo:     [$_______]                    │   │
│  │  Maintenance/mo:   [$_______]                    │   │
│  │  Vacancy Rate:     [__%]                         │   │
│  │                    [Analyze Deal →]              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ── Results ──────────────────────────────────────── │
│                                                         │
│  🟢 STRONG DEAL   (or 🟡 MARGINAL / 🔴 WEAK)           │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Cash Flow│ │ Cap Rate │ │ Cash-on- │ │  DSCR    │  │
│  │ +$1,200  │ │  6.2%    │ │ Cash 8.1%│ │  1.42    │  │
│  │ /month   │ │          │ │          │ │          │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
│  Mortgage Payment: $1,847/mo                            │
│  Break-Even Rent: $2,200/mo                             │
│  GRM: 14.2x                                             │
│                                                         │
│            [Save to Portfolio]  [Clear]                 │
│                                                         │
│  ── Saved Properties ─────────────────────────────── │
│  (same cards as Accounting > Properties tab)           │
│  Address    Est Value  Equity  Cash Flow  Cap Rate      │
│  123 Main   $520k      $140k   +$1,600    6.2%          │
│  456 Oak    $380k      $70k    +$800      5.1%          │
└─────────────────────────────────────────────────────────┘
```

#### Components

```
<RealEstatePage>
  ├── <DealCalculatorForm onAnalyze={handleAnalyze} />
  ├── <DealResultsPanel result={analysisResult}>
  │     ├── <DealSignalBadge />            // 🟢 / 🟡 / 🔴 signal
  │     ├── <DealMetricsGrid />            // KPI cards
  │     └── <SaveToPortfolioButton />      // POST /properties
  └── <SavedPropertiesGrid>
        └── <PropertyCard
              onEdit={…}
              onDelete={…}
              onAnalyze={…}           // pre-fill calculator with this property
            />
```

#### Deal metrics (all computed server-side by `PropertyAnalyzerService`)

| Metric | Formula |
|---|---|
| Monthly Cash Flow | Gross Rent − PITI − HOA − Maintenance − Vacancy |
| Cap Rate | (Annual NOI / Purchase Price) × 100 |
| Cash-on-Cash Return | (Annual Cash Flow / Total Cash Invested) × 100 |
| GRM | Purchase Price / Annual Gross Rent |
| Break-Even Rent | Monthly fixed costs / (1 − vacancy rate) |
| DSCR | NOI / Annual Debt Service |

**Signal logic:**
- 🟢 Green: `CashFlow > 0 AND CapRate >= 5%`
- 🟡 Yellow: `CashFlow > 0 OR CapRate >= 4%`
- 🔴 Red: everything else

---

## 5. Shared Components

---

### 5.1 CumulativeTransactionView

**Purpose:** After a PDF analysis completes (on either the Money In or Money Out page), render every combined transaction from all uploaded files in a single interactive table. The user can filter by category to drill into individual purchases, and export the full view to a local PDF.

This component is **purely presentational** — it receives data from the parent page's in-memory analysis result. Nothing here reads from or writes to the database.

---

#### Props

```ts
interface CumulativeTransactionViewProps {
  // For credit cards: ParsedTransactionDto[]; for checking: CheckingTransactionDto[]
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    category: string;
    direction?: string;   // "In" | "Out" — checking only; undefined for credit cards
    accountLast4?: string;
    sourceFile?: string;
  }>;

  // category totals — from categoryBreakdown (credit) or moneyInBreakdown/moneyOutBreakdown (checking)
  breakdown: Array<{ category: string; total: number; count: number; percentage: number }>;

  title: string;                    // e.g. "Purchases — March 2026" or "Money In — March 2026"
  showMonthFilter?: boolean;        // true when reportType === "YearEnd" or many months uploaded
  printId?: string;                 // optional DOM id for scoped print (default: "cumulative-txn-view")
}
```

---

#### Layout

```
┌──────────────────────────────────────────────────────────┐
│  Purchases — March 2026                                  │
│  231 transactions   Total: $9,970.46                     │
│                                         [Export to PDF]  │
├──────────────────────────────────────────────────────────┤
│  ── Filter by Category ─────────────────────────────── │
│                                                          │
│  [All (231)] [Amazon (28)] [Shopping (23)] [Dining (18)] │
│  [Travel (12)] [Gas (9)] [Entertainment (7)] [Other (6)] │
│                                                          │
│  (if showMonthFilter = true:)                            │
│  ── Filter by Month ─────────────────────────────────── │
│  [All] [Jan] [Feb] [Mar] [Apr] ... [Dec]                 │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  Date        Description                  Amount  Acct   │
│  ──────────  ─────────────────────────── ───────  ────   │
│  03/01       AMAZON MARKETPLACE           $18.31  41007  │
│  03/02       UBER EATS                    $42.50  2271   │
│  03/03       CHEVRON                      $65.00  41007  │
│  ...                                                     │
│                                                          │
│  (when a category pill is active:)                       │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Shopping — 23 transactions — Total: $1,123.61   │    │
│  └──────────────────────────────────────────────────┘    │
│  03/05       AMAZON MARKETPLACE           $89.99  41007  │
│  03/07       TARGET                       $143.21 2271   │
│  ...                                                     │
├──────────────────────────────────────────────────────────┤
│  Showing 23 of 231 transactions                          │
└──────────────────────────────────────────────────────────┘
```

---

#### State

```ts
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [selectedMonth, setSelectedMonth]       = useState<string | null>(null);

const filtered = transactions.filter(t => {
  const catMatch = !selectedCategory || t.category === selectedCategory;
  const monthMatch = !selectedMonth || t.date.startsWith(selectedMonth);
  return catMatch && monthMatch;
});
```

Month values come from parsing `t.date` — extract the `YYYY-MM` prefix and collect unique values in chronological order for the month pill row.

---

#### Category Pill active state

The active pill gets the gold border + filled background. Clicking an already-active pill resets to "All":

```tsx
<button
  key={cat.category}
  onClick={() => setSelectedCategory(prev => prev === cat.category ? null : cat.category)}
  className={selectedCategory === cat.category ? 'pill pill--active' : 'pill'}
>
  {cat.category} ({cat.count})
</button>
```

Pill order: sorted by `total` descending (highest spend category first).

---

#### Transaction Table

- Columns: **Date** | **Description** | **Amount** | **Account** *(last 4, if present)*
- For checking pages, prepend a **Direction** column showing `+` (In) or `−` (Out) with color — `--color-positive` for In, `--color-negative` for Out.
- Amount column: right-aligned. Credit card amounts always show as positive spend. Checking In amounts green, Out amounts red.
- Rows sorted by **date ascending** by default. Column headers are clickable to re-sort.
- No pagination — all rows render (React handles hundreds of rows without virtualisation for this volume).

```tsx
// Credit card row
<tr key={i}>
  <td>{t.date}</td>
  <td>{t.description}</td>
  <td className="amount">${t.amount.toFixed(2)}</td>
  <td>{t.accountLast4 ?? '—'}</td>
</tr>

// Checking row
<tr key={i}>
  <td className={t.direction === 'In' ? 'dir-in' : 'dir-out'}>
    {t.direction === 'In' ? '+' : '−'}
  </td>
  <td>{t.date}</td>
  <td>{t.description}</td>
  <td className={t.direction === 'In' ? 'amount-in' : 'amount-out'}>
    ${t.amount.toFixed(2)}
  </td>
  <td>{t.accountLast4 ?? '—'}</td>
</tr>
```

---

#### Export to PDF

Use the browser's built-in print dialog — no extra npm package needed. The user clicks "Export to PDF", the component applies a print-specific CSS class to hide everything except the transaction view, and calls `window.print()`. The browser's "Save as PDF" destination handles the local file.

**Implementation pattern:**

```tsx
const handleExport = () => {
  // Add a class to body that print CSS uses to show only this component
  document.body.classList.add('printing-transactions');
  window.print();
  document.body.classList.remove('printing-transactions');
};
```

**Print CSS (`src/styles/print.css` — imported once in `main.tsx`):**

```css
@media print {
  /* When triggered from CumulativeTransactionView, hide everything else */
  body.printing-transactions * {
    visibility: hidden;
  }
  body.printing-transactions #cumulative-txn-view,
  body.printing-transactions #cumulative-txn-view * {
    visibility: visible;
  }
  body.printing-transactions #cumulative-txn-view {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    padding: 24px;
    font-size: 11px;
    color: #000;
    background: #fff;
  }

  /* Category pills and export button don't need to print */
  body.printing-transactions .pill,
  body.printing-transactions .export-btn {
    display: none;
  }

  /* Table formatting for print */
  body.printing-transactions table {
    width: 100%;
    border-collapse: collapse;
  }
  body.printing-transactions th,
  body.printing-transactions td {
    border: 1px solid #ccc;
    padding: 4px 8px;
    text-align: left;
  }

  /* Page header */
  body.printing-transactions .print-header {
    display: block;
    margin-bottom: 16px;
    font-size: 14px;
    font-weight: bold;
  }
}

/* Hide print header on screen */
.print-header { display: none; }
```

**Print header inside the component** (hidden on screen, visible in print):

```tsx
<div id={printId ?? 'cumulative-txn-view'}>
  <div className="print-header">
    {title} — exported {new Date().toLocaleDateString()}
    <br />
    {filtered.length} transactions
    {selectedCategory ? ` · Category: ${selectedCategory}` : ''}
    {selectedMonth ? ` · Month: ${selectedMonth}` : ''}
  </div>
  {/* ... rest of component */}
</div>
```

The printed PDF respects the current filter state — if the user drilled into "Shopping" before clicking export, the PDF shows only Shopping transactions.

---

#### Year-End view

When `showMonthFilter={true}` (year-end credit card report, or many months of checking uploaded):

1. Extract unique months from `transactions[].date` sorted chronologically.
2. Render month pills above the category pills: `[All] [Jan 2025] [Feb 2025] ... [Dec 2025]`.
3. Both filters compose: selecting "March + Amazon" shows only Amazon purchases in March.
4. The export PDF header includes both active filters.

For year-end credit card saves, the parent page handles the loop — this component only needs to display what it receives.

---

#### Complete component skeleton

```tsx
// src/components/CumulativeTransactionView.tsx

import { useState, useMemo } from 'react';

export function CumulativeTransactionView({
  transactions,
  breakdown,
  title,
  showMonthFilter = false,
  printId = 'cumulative-txn-view',
}: CumulativeTransactionViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'date' | 'amount' | 'description'>('date');
  const [sortAsc, setSortAsc] = useState(true);

  const months = useMemo(() => {
    if (!showMonthFilter) return [];
    const set = new Set(transactions.map(t => t.date.slice(0, 7)));
    return [...set].sort();
  }, [transactions, showMonthFilter]);

  const filtered = useMemo(() => {
    return transactions
      .filter(t => (!selectedCategory || t.category === selectedCategory)
                && (!selectedMonth    || t.date.startsWith(selectedMonth)))
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'date')   cmp = a.date.localeCompare(b.date);
        if (sortKey === 'amount') cmp = a.amount - b.amount;
        if (sortKey === 'description') cmp = a.description.localeCompare(b.description);
        return sortAsc ? cmp : -cmp;
      });
  }, [transactions, selectedCategory, selectedMonth, sortKey, sortAsc]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const handleExport = () => {
    document.body.classList.add('printing-transactions');
    window.print();
    document.body.classList.remove('printing-transactions');
  };

  const hasDirection = transactions.some(t => t.direction);

  return (
    <div id={printId}>
      {/* print-only header */}
      <div className="print-header">
        {title} — exported {new Date().toLocaleDateString()}
        <br />
        {filtered.length} transactions
        {selectedCategory ? ` · ${selectedCategory}` : ''}
        {selectedMonth ? ` · ${selectedMonth}` : ''}
      </div>

      {/* screen header */}
      <div className="ctv-header">
        <div>
          <h3>{title}</h3>
          <span>{transactions.length} transactions</span>
        </div>
        <button className="export-btn" onClick={handleExport}>Export to PDF</button>
      </div>

      {/* month filter (year-end only) */}
      {showMonthFilter && (
        <div className="ctv-pills">
          <button className={!selectedMonth ? 'pill pill--active' : 'pill'}
                  onClick={() => setSelectedMonth(null)}>All</button>
          {months.map(m => (
            <button key={m}
                    className={selectedMonth === m ? 'pill pill--active' : 'pill'}
                    onClick={() => setSelectedMonth(prev => prev === m ? null : m)}>
              {m}
            </button>
          ))}
        </div>
      )}

      {/* category pills */}
      <div className="ctv-pills">
        <button className={!selectedCategory ? 'pill pill--active' : 'pill'}
                onClick={() => setSelectedCategory(null)}>
          All ({transactions.length})
        </button>
        {[...breakdown].sort((a, b) => b.total - a.total).map(cat => (
          <button key={cat.category}
                  className={selectedCategory === cat.category ? 'pill pill--active' : 'pill'}
                  onClick={() => setSelectedCategory(prev => prev === cat.category ? null : cat.category)}>
            {cat.category} ({cat.count})
          </button>
        ))}
      </div>

      {/* active filter summary */}
      {selectedCategory && (
        <div className="ctv-filter-banner">
          {selectedCategory} — {filtered.length} transactions
          &nbsp;·&nbsp; Total: ${filtered.reduce((s, t) => s + t.amount, 0).toFixed(2)}
        </div>
      )}

      {/* transaction table */}
      <table className="ctv-table">
        <thead>
          <tr>
            {hasDirection && <th>Dir</th>}
            <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
              Date {sortKey === 'date' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            <th onClick={() => handleSort('description')} style={{ cursor: 'pointer' }}>
              Description {sortKey === 'description' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer' }}>
              Amount {sortKey === 'amount' ? (sortAsc ? '↑' : '↓') : ''}
            </th>
            <th>Account</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((t, i) => (
            <tr key={i}>
              {hasDirection && (
                <td className={t.direction === 'In' ? 'dir-in' : 'dir-out'}>
                  {t.direction === 'In' ? '+' : '−'}
                </td>
              )}
              <td>{t.date}</td>
              <td>{t.description}</td>
              <td className={
                hasDirection
                  ? (t.direction === 'In' ? 'amount-in' : 'amount-out')
                  : 'amount'
              }>
                ${t.amount.toFixed(2)}
              </td>
              <td>{t.accountLast4 ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ctv-footer">
        Showing {filtered.length} of {transactions.length} transactions
      </div>
    </div>
  );
}
```

---

## Design Consistency Notes

### Shared UI patterns across all six pages

**PDF drop zone** (Money In, Money Out):
```tsx
<div
  onDrop={handleDrop}
  onDragOver={e => e.preventDefault()}
  className="drop-zone"
>
  <p>Drop PDFs here or <label>browse<input type="file" multiple accept=".pdf" /></label></p>
  <Button onClick={handleAnalyze} disabled={files.length === 0}>Analyze →</Button>
</div>
```

**Save flow pattern** (Money In, Money Out):
```tsx
const handleSave = async () => {
  await saveMutation.mutateAsync({ month, year, ...totals });
  queryClient.invalidateQueries({ queryKey: ['checking-history'] }); // or ['statement-history']
  toast.success(`${monthName} ${year} saved`);
};
```

**Loading / error states:** every data hook result should render a `<Skeleton>` on loading and an inline `<ErrorBanner>` on error — never a blank screen.

**No data state:** when history arrays are empty, render an instructional empty state:
```
📄 No statements saved yet.
Upload a PDF above and click "Save This Month" to start tracking.
```

### Color tokens for new charts

```css
--color-money-in:    #4CAF7D;   /* positive green — same as --color-positive */
--color-money-out:   #E05555;   /* negative red — same as --color-negative */
--color-projection:  #6B8CFF;   /* blue-purple for growth projection line */
--color-contributed: #8A8070;   /* muted line for personal-only contributions */
```

---

*✦ Babylon Wealth — Personal Finance, Built with Intention ✦*
