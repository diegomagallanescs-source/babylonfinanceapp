using System.Globalization;
using System.Text.RegularExpressions;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Interfaces.Services;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

namespace BabylonWealth.Services;

public class CheckingStatementAnalyzerService : ICheckingStatementAnalyzerService
{
    // ── Chase Checking patterns ───────────────────────────────────────────────

    // "March 17, 2026 through April 15, 2026"
    private static readonly Regex ChaseCheckingPeriod =
        new(@"(\w+)\s+(\d+),\s*(\d{4})\s+through\s+(\w+)\s+(\d+),\s*(\d{4})", RegexOptions.Compiled);

    // "Account Number: 000000887522685" — last 4 = 2685
    private static readonly Regex ChaseCheckingAccount =
        new(@"Account Number:\s*\d+?(\d{4})\s*$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex ChaseCheckingTxLine =
        new(@"^\d{2}/\d{2}\s", RegexOptions.Compiled);

    // ── SoFi patterns ────────────────────────────────────────────────────────

    // "Mar 1, 2026 - Mar 31, 2026"
    private static readonly Regex SoFiPeriod =
        new(@"(\w{3})\s+(\d{1,2}),\s*(\d{4})\s*-\s*(\w{3})\s+(\d{1,2}),\s*(\d{4})", RegexOptions.Compiled);

    // "Checking Account - 1820"
    private static readonly Regex SoFiCheckingAccount =
        new(@"Checking Account\s*-\s*(\d{4})", RegexOptions.Compiled);

    private static readonly Regex SoFiTxLine =
        new(@"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s*\d{4}\s+",
            RegexOptions.Compiled);

    // ── BofA patterns ─────────────────────────────────────────────────────────

    // "February 25, 2026 to March 26, 2026"
    private static readonly Regex BofAPeriod =
        new(@"(\w+)\s+(\d{1,2}),\s*(\d{4})\s+to\s+(\w+)\s+(\d{1,2}),\s*(\d{4})", RegexOptions.Compiled);

    // "Account number: 3251 7230 0698"
    private static readonly Regex BofAAccountLine =
        new(@"^account number:\s*([\d\s]+)$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // "03/04/26"
    private static readonly Regex BofATxLine =
        new(@"^\d{2}/\d{2}/\d{2}\s", RegexOptions.Compiled);

    // ── Shared ────────────────────────────────────────────────────────────────

    private static readonly Dictionary<string, int> MonthNamesMap =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["January"] = 1,  ["February"] = 2,  ["March"] = 3,    ["April"] = 4,
            ["May"] = 5,      ["June"] = 6,       ["July"] = 7,     ["August"] = 8,
            ["September"] = 9, ["October"] = 10, ["November"] = 11, ["December"] = 12,
            ["Jan"] = 1, ["Feb"] = 2, ["Mar"] = 3, ["Apr"] = 4,
            ["Jun"] = 6, ["Jul"] = 7, ["Aug"] = 8, ["Sep"] = 9,
            ["Oct"] = 10, ["Nov"] = 11, ["Dec"] = 12,
        };

    // Matches decimal amounts like -1,234.56 or 1234.56
    private static readonly Regex DecimalAmount =
        new(@"-?[\d,]+\.\d{2}", RegexOptions.Compiled);

    // Matches $-prefixed amounts like -$1,234.56 or $1.01
    private static readonly Regex DollarAmount =
        new(@"-?\$[\d,]+\.\d{2}", RegexOptions.Compiled);

    // ── Public entry point ────────────────────────────────────────────────────

    public CheckingStatementResponseDto Analyze(IEnumerable<(Stream stream, string fileName)> pdfInputs)
    {
        var allTransactions = new List<CheckingTransactionDto>();
        var accounts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var warnings = new List<string>();
        string statementPeriod = string.Empty;
        int? inferredMonth = null;
        int? inferredYear = null;

        foreach (var (stream, fileName) in pdfInputs)
        {
            try
            {
                var result = ParseSinglePdf(stream, fileName);
                allTransactions.AddRange(result.Transactions);
                foreach (var acc in result.Accounts) accounts.Add(acc);
                warnings.AddRange(result.Warnings);

                if (result.ClosingDate.HasValue && inferredMonth == null)
                {
                    inferredMonth = result.ClosingDate.Value.Month;
                    inferredYear = result.ClosingDate.Value.Year;
                    statementPeriod = result.Period;
                }
                else if (!string.IsNullOrEmpty(result.Period) && !statementPeriod.Contains(result.Period))
                {
                    statementPeriod = string.IsNullOrEmpty(statementPeriod)
                        ? result.Period
                        : $"{statementPeriod} + {result.Period}";
                }
            }
            catch (Exception ex)
            {
                warnings.Add($"Failed to parse '{fileName}': {ex.Message}");
            }
        }

        var moneyIn  = allTransactions.Where(t => t.Amount > 0).ToList();
        var moneyOut = allTransactions.Where(t => t.Amount < 0).ToList();

        // Exclude self-Zelle transfers (money moved between own accounts) from the Money In total
        // and re-tag them so the UI can show them as neutral self-transfers.
        var selfTransferPattern = new System.Text.RegularExpressions.Regex(
            @"\bDIEGO\b", System.Text.RegularExpressions.RegexOptions.IgnoreCase);

        moneyIn = moneyIn.Select(t =>
        {
            if (t.Category == "Zelle Received" && selfTransferPattern.IsMatch(t.Description))
                return t with { Category = "Self Transfer" };
            return t;
        }).ToList();

        var totalIn  = moneyIn.Where(t => t.Category != "Self Transfer").Sum(t => t.Amount);
        var totalOut = Math.Abs(moneyOut.Sum(t => t.Amount));

        return new CheckingStatementResponseDto
        {
            StatementPeriod  = statementPeriod,
            InferredMonth    = inferredMonth,
            InferredYear     = inferredYear,
            AccountsDetected = accounts.OrderBy(a => a).ToList(),
            TotalMoneyIn     = Math.Round(totalIn, 2),
            TotalMoneyOut    = Math.Round(totalOut, 2),
            NetFlow          = Math.Round(totalIn - totalOut, 2),
            TransactionCount = allTransactions.Count,
            Transactions     = allTransactions.OrderBy(t => t.Date).ToList(),
            MoneyInBreakdown  = BuildBreakdown(moneyIn.Where(t => t.Category != "Self Transfer").ToList(), totalIn, positive: true),
            MoneyOutBreakdown = BuildBreakdown(moneyOut, totalOut, positive: false),
            ParseWarnings    = warnings,
        };
    }

    // ── Format dispatcher ─────────────────────────────────────────────────────

    private static CheckingParseResult ParseSinglePdf(Stream stream, string fileName)
    {
        using var document = PdfDocument.Open(stream);
        var pages = document.GetPages().ToList();
        var allLines = pages.SelectMany(ExtractLines).ToList();
        var sample = allLines.Select(l => l.Trim()).Where(l => l.Length > 0).Take(40).ToList();

        if (sample.Any(l => l.Contains("SoFi", StringComparison.OrdinalIgnoreCase) ||
                             l.Contains("sofi.com", StringComparison.OrdinalIgnoreCase)))
            return ParseSoFiChecking(allLines, fileName);

        if (sample.Any(l => l.Contains("Bank of America", StringComparison.OrdinalIgnoreCase) ||
                             l.Contains("bankofamerica", StringComparison.OrdinalIgnoreCase)))
            return ParseBofAChecking(allLines, fileName);

        return ParseChaseChecking(allLines, fileName);
    }

    private static IEnumerable<string> ExtractLines(Page page) =>
        page.GetWords()
            .GroupBy(w => (int)Math.Round(w.BoundingBox.Bottom))
            .OrderByDescending(g => g.Key)
            .Select(g => string.Join(" ", g.OrderBy(w => w.BoundingBox.Left).Select(w => w.Text)));

    // ── Chase Checking ────────────────────────────────────────────────────────

    private static CheckingParseResult ParseChaseChecking(List<string> lines, string fileName)
    {
        var transactions = new List<CheckingTransactionDto>();
        var accounts     = new List<string>();
        var warnings     = new List<string>();
        DateTime? closingDate = null;
        string period = string.Empty;
        string? accountLast4 = null;
        int? statementYear = null;
        bool inTxSection = false;

        foreach (var rawLine in lines)
        {
            var line = rawLine.Trim();
            if (line.Length == 0) continue;

            if (closingDate == null)
            {
                var pm = ChaseCheckingPeriod.Match(line);
                if (pm.Success)
                {
                    var endMonth = pm.Groups[4].Value;
                    var endDay   = int.Parse(pm.Groups[5].Value);
                    statementYear = int.Parse(pm.Groups[6].Value);
                    if (MonthNamesMap.TryGetValue(endMonth, out var mn))
                    {
                        closingDate = new DateTime(statementYear.Value, mn, endDay);
                        period = $"{pm.Groups[1].Value} {pm.Groups[2].Value}, {pm.Groups[3].Value} – "
                               + $"{pm.Groups[4].Value} {pm.Groups[5].Value}, {pm.Groups[6].Value}";
                    }
                }
            }

            if (accountLast4 == null)
            {
                var am = ChaseCheckingAccount.Match(line);
                if (am.Success)
                {
                    accountLast4 = am.Groups[1].Value;
                    accounts.Add(accountLast4);
                }
            }

            if (line.Contains("*start*transaction detail", StringComparison.OrdinalIgnoreCase))
            { inTxSection = true; continue; }
            if (line.Contains("*end*transaction detail", StringComparison.OrdinalIgnoreCase))
            { inTxSection = false; continue; }

            if (!inTxSection) continue;
            if (!ChaseCheckingTxLine.IsMatch(line)) continue;
            if (line.StartsWith("DATE ") || line.StartsWith("Beginning Balance") ||
                line.StartsWith("Ending Balance")) continue;

            var tx = TryParseChaseCheckingLine(line, accountLast4, fileName, statementYear);
            if (tx != null) transactions.Add(tx);
        }

        return new CheckingParseResult(transactions, accounts, closingDate, period, warnings);
    }

    private static CheckingTransactionDto? TryParseChaseCheckingLine(
        string line, string? accountLast4, string fileName, int? year)
    {
        var dateMatch = Regex.Match(line, @"^(\d{2}/\d{2})\s+");
        if (!dateMatch.Success) return null;

        var rest = line[dateMatch.Length..].Trim();
        // Strip optional "posting date" prefix (e.g., "03/20 03/20 Payment To Chase Card...")
        rest = Regex.Replace(rest, @"^\d{2}/\d{2}\s+", "");

        var decimals = DecimalAmount.Matches(rest);
        if (decimals.Count < 2) return null;

        // Second-to-last = transaction amount; last = running balance
        var amountMatch = decimals[^2];
        if (!decimal.TryParse(amountMatch.Value.Replace(",", ""),
            NumberStyles.Any, CultureInfo.InvariantCulture, out var amount))
            return null;

        var description = rest[..amountMatch.Index].Trim();
        if (description.Length == 0) return null;

        var mmdd = dateMatch.Groups[1].Value;
        var dateStr = year.HasValue ? $"{mmdd}/{year}" : mmdd;

        var cleaned = CleanDescription(description);
        return new CheckingTransactionDto
        {
            Date        = dateStr,
            Description = cleaned,
            Amount      = amount,
            Direction   = amount >= 0 ? "In" : "Out",
            Category    = CategorizeTransaction(description, amount >= 0),
            AccountLast4 = accountLast4,
            SourceFile  = fileName,
        };
    }

    // ── SoFi Checking ─────────────────────────────────────────────────────────

    private static CheckingParseResult ParseSoFiChecking(List<string> lines, string fileName)
    {
        var transactions = new List<CheckingTransactionDto>();
        var accounts     = new List<string>();
        var warnings     = new List<string>();
        DateTime? closingDate = null;
        string period = string.Empty;
        string? accountLast4 = null;
        bool inChecking = false;

        foreach (var rawLine in lines)
        {
            var line = rawLine.Trim();
            if (line.Length == 0) continue;
            if (line.StartsWith("Transaction ID:", StringComparison.OrdinalIgnoreCase)) continue;

            var accMatch = SoFiCheckingAccount.Match(line);
            if (accMatch.Success)
            {
                accountLast4 = accMatch.Groups[1].Value;
                if (!accounts.Contains(accountLast4)) accounts.Add(accountLast4);
                inChecking = true;
                continue;
            }

            // Stop at savings section
            if (line.Contains("Savings Account", StringComparison.OrdinalIgnoreCase))
            { inChecking = false; continue; }

            if (closingDate == null)
            {
                var pm = SoFiPeriod.Match(line);
                if (pm.Success && MonthNamesMap.TryGetValue(pm.Groups[4].Value, out var mn))
                {
                    var endDay = int.Parse(pm.Groups[5].Value);
                    var yr     = int.Parse(pm.Groups[6].Value);
                    closingDate = new DateTime(yr, mn, endDay);
                    period = $"{pm.Groups[1].Value} {pm.Groups[2].Value}, {pm.Groups[3].Value} – "
                           + $"{pm.Groups[4].Value} {pm.Groups[5].Value}, {pm.Groups[6].Value}";
                }
            }

            if (!inChecking) continue;
            if (!SoFiTxLine.IsMatch(line)) continue;

            var tx = TryParseSoFiLine(line, accountLast4, fileName);
            if (tx != null) transactions.Add(tx);
        }

        return new CheckingParseResult(transactions, accounts, closingDate, period, warnings);
    }

    private static CheckingTransactionDto? TryParseSoFiLine(
        string line, string? accountLast4, string fileName)
    {
        // "Mar 31, 2026 Direct Payment Zelle® Payment to Diego -$1,000.00 $4,636.11"
        var dateMatch = Regex.Match(line,
            @"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s*(\d{4})\s+");
        if (!dateMatch.Success) return null;

        if (!MonthNamesMap.TryGetValue(dateMatch.Groups[1].Value, out var month)) return null;
        var day  = int.Parse(dateMatch.Groups[2].Value);
        var yr   = int.Parse(dateMatch.Groups[3].Value);
        var dateStr = $"{month:D2}/{day:D2}/{yr}";

        var rest = line[dateMatch.Length..].Trim();

        var dollars = DollarAmount.Matches(rest);
        if (dollars.Count < 2) return null;

        // Second-to-last = transaction amount; last = balance
        var amountMatch = dollars[^2];
        var amountStr   = amountMatch.Value.Replace("$", "").Replace(",", "");
        if (!decimal.TryParse(amountStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var amount))
            return null;

        // Full string before the amount (includes type like "Direct Deposit")
        var fullDesc = rest[..amountMatch.Index].Trim();

        // Strip leading transaction-type token for display
        var displayDesc = Regex.Replace(fullDesc,
            @"^(Direct Payment|Direct Deposit|Interest Earned|ACH|ATM)\s+",
            "", RegexOptions.IgnoreCase).Trim();
        if (displayDesc.Length == 0) displayDesc = fullDesc;

        var cleaned = CleanDescription(displayDesc);
        return new CheckingTransactionDto
        {
            Date         = dateStr,
            Description  = cleaned,
            Amount       = amount,
            Direction    = amount >= 0 ? "In" : "Out",
            Category     = CategorizeTransaction(fullDesc, amount >= 0),
            AccountLast4 = accountLast4,
            SourceFile   = fileName,
        };
    }

    // ── BofA Checking ─────────────────────────────────────────────────────────

    private enum BofASection    { None, Checking, Savings }
    private enum BofASubSection { None, Deposits, Withdrawals, Fees }

    private static CheckingParseResult ParseBofAChecking(List<string> lines, string fileName)
    {
        var transactions = new List<CheckingTransactionDto>();
        var accounts     = new List<string>();
        var warnings     = new List<string>();
        DateTime? closingDate = null;
        string period = string.Empty;
        string? accountLast4 = null;
        string? pendingAccountLast4 = null;   // buffered until we confirm checking vs savings
        var section    = BofASection.None;
        var subSection = BofASubSection.None;

        foreach (var rawLine in lines)
        {
            var line = rawLine.Trim();
            if (line.Length == 0) continue;

            if (closingDate == null)
            {
                var pm = BofAPeriod.Match(line);
                if (pm.Success && MonthNamesMap.TryGetValue(pm.Groups[4].Value, out var mn))
                {
                    var endDay = int.Parse(pm.Groups[5].Value);
                    var yr     = int.Parse(pm.Groups[6].Value);
                    closingDate = new DateTime(yr, mn, endDay);
                    period = $"{pm.Groups[1].Value} {pm.Groups[2].Value}, {pm.Groups[3].Value} – "
                           + $"{pm.Groups[4].Value} {pm.Groups[5].Value}, {pm.Groups[6].Value}";
                }
            }

            // Buffer account number until we know which type of account it belongs to
            var accMatch = BofAAccountLine.Match(line);
            if (accMatch.Success)
            {
                var raw = accMatch.Groups[1].Value.Replace(" ", "");
                pendingAccountLast4 = raw.Length >= 4 ? raw[^4..] : raw;
            }

            // Confirm checking account
            if (line.Contains("SafeBalance Banking", StringComparison.OrdinalIgnoreCase) ||
                line.Contains("Advantage Checking", StringComparison.OrdinalIgnoreCase)  ||
                line.Contains("Core Checking", StringComparison.OrdinalIgnoreCase))
            {
                section = BofASection.Checking;
                if (pendingAccountLast4 != null)
                {
                    accountLast4 = pendingAccountLast4;
                    if (!accounts.Contains(accountLast4)) accounts.Add(accountLast4);
                    pendingAccountLast4 = null;
                }
                continue;
            }

            // Savings — stop processing transactions
            if (line.Contains("Advantage Savings", StringComparison.OrdinalIgnoreCase) ||
                line.Contains("Savings Account",   StringComparison.OrdinalIgnoreCase))
            {
                section = BofASection.Savings;
                pendingAccountLast4 = null;
                continue;
            }

            if (section == BofASection.Savings) continue;

            // Sub-section detection (appear both in summary and as actual headers)
            if (line.StartsWith("Deposits and other additions", StringComparison.OrdinalIgnoreCase))
            { subSection = BofASubSection.Deposits; continue; }

            if (line.StartsWith("Withdrawals and other subtractions", StringComparison.OrdinalIgnoreCase))
            { subSection = BofASubSection.Withdrawals; continue; }

            if (line.StartsWith("Service fees", StringComparison.OrdinalIgnoreCase) && !BofATxLine.IsMatch(line))
            { subSection = BofASubSection.Fees; continue; }

            // Skip column headers and total lines
            if (line.StartsWith("Date Description", StringComparison.OrdinalIgnoreCase)) continue;
            if (line.StartsWith("Date Transaction description", StringComparison.OrdinalIgnoreCase)) continue;
            if (line.StartsWith("Total deposits", StringComparison.OrdinalIgnoreCase)) continue;
            if (line.StartsWith("Total withdrawals", StringComparison.OrdinalIgnoreCase)) continue;
            if (line.StartsWith("Total service fees", StringComparison.OrdinalIgnoreCase)) continue;
            if (line.StartsWith("Account summary", StringComparison.OrdinalIgnoreCase)) continue;
            if (line.StartsWith("Beginning balance", StringComparison.OrdinalIgnoreCase)) continue;
            if (line.StartsWith("Ending balance", StringComparison.OrdinalIgnoreCase)) continue;

            if (subSection == BofASubSection.None) continue;
            if (!BofATxLine.IsMatch(line)) continue;

            var tx = TryParseBofALine(line, accountLast4, fileName, subSection);
            if (tx != null) transactions.Add(tx);
        }

        return new CheckingParseResult(transactions, accounts, closingDate, period, warnings);
    }

    private static CheckingTransactionDto? TryParseBofALine(
        string line, string? accountLast4, string fileName, BofASubSection subSection)
    {
        var dateMatch = Regex.Match(line, @"^(\d{2}/\d{2}/\d{2})\s+");
        if (!dateMatch.Success) return null;

        var parts = dateMatch.Groups[1].Value.Split('/');
        var dateStr = $"{parts[0]}/{parts[1]}/{2000 + int.Parse(parts[2])}";

        var rest = line[dateMatch.Length..].Trim();

        var decimals = DecimalAmount.Matches(rest);
        if (decimals.Count < 1) return null;

        var amountMatch = decimals[^1]; // BofA: last decimal on line is always the amount
        if (!decimal.TryParse(amountMatch.Value.Replace(",", ""),
            NumberStyles.Any, CultureInfo.InvariantCulture, out var amount))
            return null;

        var description = rest[..amountMatch.Index].Trim();
        if (description.Length == 0) return null;

        // Normalise sign by section
        if (subSection == BofASubSection.Deposits    && amount < 0) amount = Math.Abs(amount);
        if (subSection is BofASubSection.Withdrawals
                       or BofASubSection.Fees        && amount > 0) amount = -amount;

        var category = subSection == BofASubSection.Fees
            ? "Service Fee"
            : CategorizeTransaction(description, amount >= 0);

        var cleaned = CleanDescription(description);
        return new CheckingTransactionDto
        {
            Date         = dateStr,
            Description  = cleaned,
            Amount       = amount,
            Direction    = amount >= 0 ? "In" : "Out",
            Category     = category,
            AccountLast4 = accountLast4,
            SourceFile   = fileName,
        };
    }

    // ── Categorisation ────────────────────────────────────────────────────────

    private static string CategorizeTransaction(string description, bool isInbound)
    {
        var d = description.ToUpperInvariant();

        if (isInbound)
        {
            if (d.Contains("PAYROLL")  || d.Contains("SALARY")  || d.Contains("WAGES") ||
                d.Contains("STAREDLA") || d.Contains("DIRECT DEPOSIT"))
                return "Payroll";

            if (d.Contains("ZELLE") && (d.Contains(" FROM ") || d.Contains("PAYMENT FROM")))
                return "Zelle Received";

            if (d.Contains("WIX") || d.Contains("PAYPAL") || d.Contains("STRIPE") ||
                d.Contains("VENMO") || d.Contains("SQUARE"))
                return "Business / Freelance";

            if (d.Contains("REFUND") || d.Contains("CREDIT REFUND") ||
                d.Contains("TEMPORARY CREDIT") || d.Contains("ADJUSTMENT") ||
                d.Contains("REIMBURSEMENT") || d.Contains("AMEX CREDIT"))
                return "Refund / Credit";

            if (d.Contains("INTEREST"))
                return "Interest";

            if (d.Contains("SOFI") || d.Contains("REMOTE ONLINE DEPOSIT") ||
                d.Contains("WIRE") || d.Contains("ACH CREDIT") || d.Contains("PL DISB"))
                return "Transfer In";

            return "Other Income";
        }

        // Investing first — check before generic bank-transfer matches
        if (d.Contains("AMERITRADE") || d.Contains("SCHWAB") || d.Contains("FIDELITY") ||
            d.Contains("VANGUARD")   || d.Contains("E*TRADE") || d.Contains("ETRADE") ||
            d.Contains("ROBINHOOD")  || d.Contains("WEBULL")  || d.Contains("WEALTHFRONT") ||
            d.Contains("BETTERMENT") || d.Contains("ACORNS")  || d.Contains("SOFI INVEST") ||
            d.Contains("M1 FINANCE") || d.Contains("CHASE INVEST") ||
            d.Contains("MERRILL")    || d.Contains("INTERACTIVE BROKER"))
            return "Investing";

        // Credit card payments
        if (d.Contains("AMERICAN EXPRESS") || d.Contains("AMEX EPAYMENT") ||
            d.Contains("AMEX ACH")          || d.Contains("CARDMEMBER SERV") ||
            d.Contains("PAYMENT TO CHASE CARD") || d.Contains("CHASE CARD") ||
            d.Contains("APPLECARD")  || d.Contains("APPLE CARD") ||
            d.Contains("DISCOVER CARD") || d.Contains("CITI CARD") ||
            d.Contains("CITICARD")   || d.Contains("CAPITAL ONE") ||
            d.Contains("BANK OF AMERICA CARD"))
            return "Credit Card Payment";

        // Zelle sent
        if (d.Contains("ZELLE") && (d.Contains(" TO ") || d.Contains("PAYMENT TO")))
            return "Zelle Sent";

        // ATM / Cash withdrawals
        if (d.Contains("ATM WITHDRAWAL") || d.Contains("ATM WD") ||
            d.Contains("WITHDRWL") || d.Contains("CASH WD"))
            return "ATM / Cash";

        // Taxes
        if (d.Contains("IRS ") || d.Contains("USATAXPYMT") || d.Contains("FRANCHISE TAX") ||
            d.Contains("STATE TAX") || d.Contains("TAX PAYMENT") || d.Contains("IRSTAX"))
            return "Taxes";

        // Debit card purchases
        if (d.Contains("CHECKCARD") || d.Contains("DEBIT CARD PURCHASE") || d.Contains("POS PURCHASE"))
            return "Debit Card Purchase";

        // Bank / wire transfers out
        if (d.Contains("SOFI")   || d.Contains("WIRE TRANSFER") ||
            d.Contains("WISE ")  || d.Contains("WISE INC") ||
            d.Contains("ACH TRANSFER") || d.Contains("BANK TRANSFER"))
            return "Bank Transfer";

        return "Other Payment";
    }

    private static string CleanDescription(string description)
    {
        var s = description;
        s = Regex.Replace(s, @"\s+Web ID:\s*\w+",   "", RegexOptions.IgnoreCase);
        s = Regex.Replace(s, @"\s+CCD ID:\s*\w+",   "", RegexOptions.IgnoreCase);
        s = Regex.Replace(s, @"\s+PPD ID:\s*\w+",   "", RegexOptions.IgnoreCase);
        s = Regex.Replace(s, @"\s+Conf#\s*\w+",     "", RegexOptions.IgnoreCase);
        s = Regex.Replace(s, @"\s+\d{10,}",         ""); // long reference numbers
        s = Regex.Replace(s, @"\s{2,}",              " ");
        return s.Trim();
    }

    // ── Breakdown helper ──────────────────────────────────────────────────────

    private static List<CheckingFlowDto> BuildBreakdown(
        List<CheckingTransactionDto> transactions, decimal total, bool positive)
    {
        return transactions
            .GroupBy(t => t.Category)
            .Select(g =>
            {
                var groupTotal = Math.Abs(Math.Round(g.Sum(t => t.Amount), 2));
                return new CheckingFlowDto
                {
                    Category   = g.Key,
                    Total      = groupTotal,
                    Count      = g.Count(),
                    Percentage = total > 0 ? Math.Round(groupTotal / total * 100, 1) : 0,
                };
            })
            .OrderByDescending(c => c.Total)
            .ToList();
    }

    // ── Internal record ───────────────────────────────────────────────────────

    private record CheckingParseResult(
        List<CheckingTransactionDto> Transactions,
        List<string> Accounts,
        DateTime? ClosingDate,
        string Period,
        List<string> Warnings);
}
