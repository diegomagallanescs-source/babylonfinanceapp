using System.Globalization;
using System.Text.RegularExpressions;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Interfaces.Services;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

namespace BabylonWealth.Services;

public class StatementAnalyzerService : IStatementAnalyzerService
{
    // ── Monthly statement patterns ────────────────────────────────────────────

    private static readonly Regex MonthlyDateLineStart =
        new(@"^\d{2}/\d{2}(?:/\d{2,4})?\*?\s", RegexOptions.Compiled);

    private static readonly Regex ChaseAccountPattern =
        new(@"XXXX\s+XXXX\s+XXXX\s+(\d{4})", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex AmexMonthlyAccountPattern =
        new(@"Account Ending\s+([\d\-]+)", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex ChaseClosingDatePattern =
        new(@"Opening/Closing Date\s+\d{2}/\d{2}/\d{2}\s*[-–]\s*(\d{2}/\d{2}/\d{2})",
            RegexOptions.Compiled);

    private static readonly Regex AmexClosingDatePattern =
        new(@"\bClosing Date\s+(\d{2}/\d{2}/\d{2})\b", RegexOptions.Compiled);

    // ── Chase Spending Report patterns ────────────────────────────────────────

    // "Jan 01, 2025 to Dec 31, 2025 Spending Report 4974"
    private static readonly Regex ChaseSpendingReportHeader =
        new(@"\w+ \d{2}, (\d{4}) to \w+ \d{2}, \d{4} Spending Report\s+(\d{4})",
            RegexOptions.Compiled);

    private static readonly Regex ChaseSpendingReportTxLine =
        new(@"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s*\d{4}\s+",
            RegexOptions.Compiled);

    // ── Amex Year-End Summary patterns ────────────────────────────────────────

    private static readonly Regex AmexYearEndAccountPattern =
        new(@"Card[^\d]{0,5}(\d{5})\s*$", RegexOptions.Compiled);

    private static readonly Regex AmexYearEndYearPattern =
        new(@"through\s+\w+ \d+,\s*(\d{4})", RegexOptions.Compiled);

    private static readonly Regex AmexYearEndTxLine =
        new(@"^\d{2}/\d{2}/\d{4}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+",
            RegexOptions.Compiled);

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

    private static readonly string[] ExcludedDescriptions =
    [
        "PURCHASE INTEREST CHARGE",
        "INTEREST CHARGE",
        "PERIODIC FINANCE CHARGE",
        "Payment Thank You",
        "PAYMENT THANK YOU",
        "AutoPay Payment",
        "ONLINE PAYMENT",
        "AUTOPAY PAYMENT",
        "BALANCE TRANSFER",
        "RETURNED PAYMENT",
        "MEM RWDS",
        "Reimbursement",
        "REIMBURSEMENT",
    ];

    // ── Public entry point ────────────────────────────────────────────────────

    public StatementAnalysisResponseDto Analyze(IEnumerable<(Stream stream, string fileName)> pdfInputs)
    {
        var allTransactions = new List<ParsedTransactionDto>();
        var accounts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var warnings = new List<string>();
        string statementPeriod = string.Empty;
        int? inferredMonth = null;
        int? inferredYear = null;
        bool hasYearEnd = false;

        foreach (var (stream, fileName) in pdfInputs)
        {
            try
            {
                var result = ParseSinglePdf(stream, fileName);
                allTransactions.AddRange(result.Transactions);
                foreach (var acc in result.Accounts) accounts.Add(acc);

                if (result.ReportType == "YearEnd")
                {
                    hasYearEnd = true;
                    inferredYear ??= result.ClosingDate?.Year;
                    if (!string.IsNullOrEmpty(result.Period))
                    {
                        statementPeriod = string.IsNullOrEmpty(statementPeriod)
                            ? result.Period
                            : statementPeriod.Contains(result.Period)
                                ? statementPeriod
                                : $"{statementPeriod} + {result.Period}";
                    }
                }
                else if (result.ClosingDate.HasValue)
                {
                    if (inferredMonth == null)
                    {
                        inferredMonth = result.ClosingDate.Value.Month;
                        inferredYear = result.ClosingDate.Value.Year;
                        statementPeriod = result.Period;
                    }
                    else if (!statementPeriod.Contains(result.Period))
                    {
                        statementPeriod = $"{statementPeriod} + {result.Period}";
                    }
                }

                if (!result.FoundActivitySection)
                    warnings.Add($"Could not locate transaction section in '{fileName}'. File may be unsupported.");
            }
            catch (Exception ex)
            {
                warnings.Add($"Could not read '{fileName}': {ex.Message}");
            }
        }

        if (string.IsNullOrEmpty(statementPeriod))
            statementPeriod = allTransactions.Count > 0 ? "Unknown period" : "No transactions found";

        var totalPurchases = allTransactions.Sum(t => t.Amount);

        var categoryBreakdown = allTransactions
            .GroupBy(t => t.Category)
            .Select(g => new StatementCategoryDto
            {
                Category = g.Key,
                Total = Math.Round(g.Sum(t => t.Amount), 2),
                Count = g.Count(),
                Percentage = totalPurchases > 0
                    ? Math.Round(g.Sum(t => t.Amount) / totalPurchases * 100, 1)
                    : 0
            })
            .OrderByDescending(c => c.Total)
            .ToList<StatementCategoryDto>();

        var topMerchants = allTransactions
            .GroupBy(t => NormalizeMerchantName(t.Description))
            .Select(g => new TopMerchantDto
            {
                Name = g.Key,
                Total = Math.Round(g.Sum(t => t.Amount), 2),
                Count = g.Count()
            })
            .OrderByDescending(m => m.Total)
            .Take(10)
            .ToList();

        var monthlyBreakdown = allTransactions
            .Select(t => new { t, month = ExtractMonthFromDate(t.Date) })
            .Where(x => x.month.HasValue)
            .GroupBy(x => x.month!.Value)
            .Select(g => new MonthlySpendDto
            {
                Month = g.Key,
                MonthName = CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(g.Key),
                Total = Math.Round(g.Sum(x => x.t.Amount), 2),
                Count = g.Count()
            })
            .OrderBy(m => m.Month)
            .ToList();

        return new StatementAnalysisResponseDto
        {
            StatementPeriod = statementPeriod,
            ReportType = hasYearEnd ? "YearEnd" : "Monthly",
            InferredMonth = hasYearEnd ? null : inferredMonth,
            InferredYear = inferredYear,
            AccountsDetected = accounts.OrderBy(a => a).ToList(),
            TotalPurchases = Math.Round(totalPurchases, 2),
            TransactionCount = allTransactions.Count,
            HasTransactions = allTransactions.Count > 0,
            Transactions = allTransactions.OrderBy(t => t.Date)
                .Select(t => t with { Merchant = NormalizeMerchantName(t.Description) })
                .ToList(),
            CategoryBreakdown = categoryBreakdown,
            TopMerchants = topMerchants,
            MonthlyBreakdown = monthlyBreakdown,
            ParseWarnings = warnings
        };
    }

    // ── Format detection & dispatch ───────────────────────────────────────────

    private record PdfParseResult(
        List<ParsedTransactionDto> Transactions,
        List<string> Accounts,
        DateTime? ClosingDate,
        string Period,
        bool FoundActivitySection,
        string ReportType = "Monthly");

    private PdfParseResult ParseSinglePdf(Stream stream, string fileName)
    {
        using var document = PdfDocument.Open(stream);
        var pages = document.GetPages().ToList();
        var allLines = pages.SelectMany(ExtractLines).ToList();

        var headerSample = allLines
            .Select(l => l.Trim())
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .Take(30)
            .ToList();

        if (headerSample.Any(l => l.Contains("Year-End Summary", StringComparison.OrdinalIgnoreCase)))
            return ParseAmexYearEndSummary(pages, fileName);

        if (headerSample.Any(l => ChaseSpendingReportHeader.IsMatch(l)))
            return ParseChaseSpendingReport(allLines, fileName);

        return ParseMonthlyStatement(allLines, fileName);
    }

    // ── Monthly statement parser (Chase + Amex monthly) ──────────────────────

    private static PdfParseResult ParseMonthlyStatement(List<string> allLines, string fileName)
    {
        var transactions = new List<ParsedTransactionDto>();
        var accounts = new List<string>();
        DateTime? closingDate = null;
        string period = string.Empty;
        string? accountLast4 = null;
        bool foundActivitySection = false;
        bool inActivitySection = false;
        string? pendingDescription = null;

        foreach (var rawLine in allLines)
        {
            var line = rawLine.Trim();
            if (string.IsNullOrWhiteSpace(line)) continue;

            if (accountLast4 == null)
            {
                var m = ChaseAccountPattern.Match(line);
                if (m.Success)
                {
                    accountLast4 = m.Groups[1].Value;
                    accounts.Add(accountLast4);
                }
                else
                {
                    var ma = AmexMonthlyAccountPattern.Match(line);
                    if (ma.Success)
                    {
                        var raw = ma.Groups[1].Value.Replace("-", "");
                        accountLast4 = raw.Length > 5 ? raw[^5..] : raw;
                        accounts.Add(accountLast4);
                    }
                }
            }

            if (closingDate == null)
            {
                var m = ChaseClosingDatePattern.Match(line);
                if (m.Success && DateTime.TryParseExact(m.Groups[1].Value, "MM/dd/yy",
                    CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
                {
                    closingDate = dt;
                    period = $"{dt:MMMM yyyy}";
                }
                else
                {
                    var ma = AmexClosingDatePattern.Match(line);
                    if (ma.Success && DateTime.TryParseExact(ma.Groups[1].Value, "MM/dd/yy",
                        CultureInfo.InvariantCulture, DateTimeStyles.None, out var dta))
                    {
                        closingDate = dta;
                        period = $"{dta:MMMM yyyy}";
                    }
                }
            }

            if (line.Contains("ACCOUNT ACTIVITY", StringComparison.OrdinalIgnoreCase) ||
                line.Equals("New Charges", StringComparison.OrdinalIgnoreCase))
            {
                foundActivitySection = true;
                inActivitySection = true;
            }

            if (!inActivitySection) continue;

            var tx = TryParseMonthlyTransactionLine(line, pendingDescription, accountLast4, fileName);
            if (tx != null)
            {
                transactions.Add(tx);
                pendingDescription = null;
            }
            else if (!MonthlyDateLineStart.IsMatch(line))
            {
                pendingDescription = line;
            }
        }

        return new PdfParseResult(transactions, accounts, closingDate, period, foundActivitySection);
    }

    // ── Chase Spending Report parser ──────────────────────────────────────────

    private static PdfParseResult ParseChaseSpendingReport(List<string> allLines, string fileName)
    {
        var transactions = new List<ParsedTransactionDto>();
        var accounts = new List<string>();
        DateTime? closingDate = null;
        string period = string.Empty;
        string? accountLast4 = null;
        bool foundActivitySection = false;

        foreach (var rawLine in allLines)
        {
            var line = rawLine.Trim();
            if (string.IsNullOrWhiteSpace(line)) continue;

            // Always skip the report header line (it appears on every page)
            if (ChaseSpendingReportHeader.IsMatch(line))
            {
                if (closingDate == null)
                {
                    var m = ChaseSpendingReportHeader.Match(line);
                    var year = int.Parse(m.Groups[1].Value);
                    accountLast4 = m.Groups[2].Value;
                    accounts.Add(accountLast4);
                    closingDate = new DateTime(year, 12, 31);
                    period = $"Full Year {year}";
                    foundActivitySection = true;
                }
                continue; // Always skip, regardless of whether already parsed
            }

            if (!foundActivitySection) continue;
            if (!ChaseSpendingReportTxLine.IsMatch(line)) continue;

            var tx = TryParseChaseSpendingReportLine(line, accountLast4, fileName);
            if (tx != null) transactions.Add(tx);
        }

        return new PdfParseResult(transactions, accounts, closingDate, period,
            foundActivitySection, "YearEnd");
    }

    private static ParsedTransactionDto? TryParseChaseSpendingReportLine(
        string line, string? accountLast4, string sourceFile)
    {
        // Format: "Dec 31, 2025  Jan 01, 2026  DESCRIPTION  $14.90"
        var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        // Needs: 3 tx-date parts + 3 posted-date parts + description + amount (min 8)
        if (parts.Length < 8) return null;

        var amountStr = parts[^1].Replace(",", "").TrimStart('$');
        if (!decimal.TryParse(amountStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var amount))
            return null;
        if (amount <= 0) return null;

        if (!MonthNamesMap.TryGetValue(parts[0], out var txMonth)) return null;
        var dayStr = parts[1].TrimEnd(',');
        var normalizedDate = $"{txMonth:D2}/{dayStr.PadLeft(2, '0')}";

        // Description occupies parts[6..^1]
        var description = string.Join(" ", parts[6..^1]).Trim();
        if (ShouldExclude(description)) return null;

        return new ParsedTransactionDto
        {
            Date = normalizedDate,
            Description = description,
            Amount = amount,
            Category = CategorizeTransaction(description),
            AccountLast4 = accountLast4,
            SourceFile = sourceFile
        };
    }

    // ── Amex Year-End Summary parser ──────────────────────────────────────────
    // Uses raw page word objects so we can distinguish Charges vs Credits columns
    // by the X-position of each transaction's amount token.

    private static PdfParseResult ParseAmexYearEndSummary(
        IReadOnlyList<Page> pages, string fileName)
    {
        var transactions = new List<ParsedTransactionDto>();
        var accounts = new List<string>();
        DateTime? closingDate = null;
        string period = string.Empty;
        string? accountLast4 = null;
        bool inDetailSection = false;
        double creditsColumnLeft = double.MaxValue; // set when we find the column header

        foreach (var page in pages)
        {
            var allWords = page.GetWords().ToList();

            // Detect the "Credits" column X-position from the column header line
            if (creditsColumnLeft == double.MaxValue)
            {
                var lineGroups = allWords
                    .GroupBy(w => (int)Math.Round(w.BoundingBox.Bottom))
                    .ToList();

                foreach (var grp in lineGroups)
                {
                    var lineText = string.Join(" ", grp
                        .OrderBy(w => w.BoundingBox.Left).Select(w => w.Text));
                    if (lineText.Contains("Charges", StringComparison.OrdinalIgnoreCase) &&
                        lineText.Contains("Credits", StringComparison.OrdinalIgnoreCase))
                    {
                        var creditsWord = grp
                            .OrderBy(w => w.BoundingBox.Left)
                            .LastOrDefault(w =>
                                w.Text.Equals("Credits", StringComparison.OrdinalIgnoreCase));
                        if (creditsWord != null)
                        {
                            creditsColumnLeft = creditsWord.BoundingBox.Left;
                            break;
                        }
                    }
                }
            }

            // Process all lines on this page
            var orderedGroups = allWords
                .GroupBy(w => (int)Math.Round(w.BoundingBox.Bottom))
                .OrderByDescending(g => g.Key);

            foreach (var grp in orderedGroups)
            {
                var lineWords = grp.OrderBy(w => w.BoundingBox.Left).ToList();
                var rawLine = string.Join(" ", lineWords.Select(w => w.Text));
                var line = rawLine.Trim();
                if (string.IsNullOrWhiteSpace(line)) continue;

                // Extract account number
                if (accountLast4 == null)
                {
                    var m = AmexYearEndAccountPattern.Match(line);
                    if (m.Success && (line.Contains("Card", StringComparison.OrdinalIgnoreCase) ||
                                      line.Contains("Account", StringComparison.OrdinalIgnoreCase)))
                    {
                        accountLast4 = m.Groups[1].Value;
                        accounts.Add(accountLast4);
                    }
                }

                // Extract report year
                if (closingDate == null)
                {
                    var m = AmexYearEndYearPattern.Match(line);
                    if (m.Success && int.TryParse(m.Groups[1].Value, out var yr))
                    {
                        closingDate = new DateTime(yr, 12, 31);
                        period = $"Full Year {yr}";
                    }
                }

                if (line.Contains("Details of Spending", StringComparison.OrdinalIgnoreCase))
                {
                    inDetailSection = true;
                    continue;
                }

                if (!inDetailSection) continue;
                if (IsAmexYearEndStructuralLine(line)) continue;
                if (!AmexYearEndTxLine.IsMatch(line)) continue;

                // Skip if the amount is in the Credits column (right of creditsColumnLeft)
                if (creditsColumnLeft < double.MaxValue)
                {
                    var lastWord = lineWords.Last();
                    if (lastWord.BoundingBox.Left >= creditsColumnLeft - 5)
                        continue; // Credit line — exclude
                }

                var tx = TryParseAmexYearEndLine(line, accountLast4, fileName);
                if (tx != null) transactions.Add(tx);
            }
        }

        return new PdfParseResult(transactions, accounts, closingDate, period,
            inDetailSection, "YearEnd");
    }

    private static bool IsAmexYearEndStructuralLine(string line)
    {
        if (line.Contains("Year-End Summary", StringComparison.OrdinalIgnoreCase)) return true;
        if (line.Contains("Includes charges from", StringComparison.OrdinalIgnoreCase)) return true;
        if (line.Contains("Prepared for", StringComparison.OrdinalIgnoreCase)) return true;
        if (line.Contains("Card Member", StringComparison.OrdinalIgnoreCase)) return true;
        if (line.Contains("Account Number", StringComparison.OrdinalIgnoreCase)) return true;
        if (line.StartsWith("Date ", StringComparison.OrdinalIgnoreCase) &&
            line.Contains("Month Billed", StringComparison.OrdinalIgnoreCase)) return true;
        if (line.Contains("Subtotal", StringComparison.OrdinalIgnoreCase)) return true;
        if (line.Contains("Total Spending", StringComparison.OrdinalIgnoreCase)) return true;
        if (line.Contains("Details of Spending", StringComparison.OrdinalIgnoreCase)) return true;
        if (line.Contains("Any charges processed", StringComparison.OrdinalIgnoreCase)) return true;
        if (line.StartsWith("p. ", StringComparison.OrdinalIgnoreCase)) return true;
        return false;
    }

    private static ParsedTransactionDto? TryParseAmexYearEndLine(
        string line, string? accountLast4, string sourceFile)
    {
        // Format: "12/25/2025 January DESCRIPTION $14.99"
        var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 4) return null;

        var amountStr = parts[^1].Replace(",", "").TrimStart('$');
        if (!decimal.TryParse(amountStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var amount))
            return null;
        if (amount <= 0) return null;

        var dateParts = parts[0].Split('/');
        var normalizedDate = $"{dateParts[0]}/{dateParts[1]}";

        // Skip parts[1] (month billed); description is parts[2..^1]
        var description = string.Join(" ", parts[2..^1]).Trim();

        if (description.StartsWith("AplPay ", StringComparison.OrdinalIgnoreCase))
            description = description[7..].TrimStart();

        if (ShouldExclude(description)) return null;
        if (description.StartsWith("Platinum ", StringComparison.OrdinalIgnoreCase)) return null;
        if (description.StartsWith("PLATINUM ", StringComparison.OrdinalIgnoreCase)) return null;

        return new ParsedTransactionDto
        {
            Date = normalizedDate,
            Description = description,
            Amount = amount,
            Category = CategorizeTransaction(description),
            AccountLast4 = accountLast4,
            SourceFile = sourceFile
        };
    }

    // ── Shared helpers ────────────────────────────────────────────────────────

    private static List<string> ExtractLines(Page page)
    {
        var lineGroups = page.GetWords()
            .GroupBy(w => (int)Math.Round(w.BoundingBox.Bottom))
            .OrderByDescending(g => g.Key)
            .Select(g => string.Join(" ", g
                .OrderBy(w => w.BoundingBox.Left)
                .Select(w => w.Text)));

        return lineGroups.ToList();
    }

    private static int? ExtractMonthFromDate(string date)
    {
        if (string.IsNullOrEmpty(date)) return null;
        var slash = date.IndexOf('/');
        if (slash <= 0) return null;
        return int.TryParse(date[..slash], out var m) && m is >= 1 and <= 12 ? m : null;
    }

    private static ParsedTransactionDto? TryParseMonthlyTransactionLine(
        string line, string? pendingDescription, string? accountLast4, string sourceFile)
    {
        if (!MonthlyDateLineStart.IsMatch(line)) return null;

        var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2) return null;

        var amountStr = parts[^1].Replace(",", "").TrimStart('$');
        if (!decimal.TryParse(amountStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var amount))
            return null;
        if (amount <= 0) return null;

        var rawDate = parts[0].TrimEnd('*');
        var dateParts = rawDate.Split('/');
        var normalizedDate = dateParts.Length >= 2 ? $"{dateParts[0]}/{dateParts[1]}" : rawDate;

        string description;
        if (parts.Length == 2)
        {
            if (string.IsNullOrWhiteSpace(pendingDescription)) return null;
            description = pendingDescription.Trim();
            if (description.StartsWith("AplPay ", StringComparison.OrdinalIgnoreCase))
                description = description[7..].TrimStart();
        }
        else
        {
            description = string.Join(" ", parts[1..^1]).Trim();
        }

        if (ShouldExclude(description)) return null;

        return new ParsedTransactionDto
        {
            Date = normalizedDate,
            Description = description,
            Amount = amount,
            Category = CategorizeTransaction(description),
            AccountLast4 = accountLast4,
            SourceFile = sourceFile
        };
    }

    private static bool ShouldExclude(string description)
    {
        foreach (var keyword in ExcludedDescriptions)
        {
            if (description.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        if (description.Contains("EXCHG RATE", StringComparison.OrdinalIgnoreCase)) return true;
        if (description.Contains("X 0.", StringComparison.OrdinalIgnoreCase)) return true;

        return false;
    }

    private static string NormalizeMerchantName(string description)
    {
        var desc = description.ToUpperInvariant();

        if (desc.Contains("AMZN") || desc.Contains("AMAZON")) return "Amazon";
        if (desc.Contains("ALASKA AIR")) return "Alaska Airlines";
        if (desc.Contains("SOUTHWEST AIR") || desc.Contains("SOUTHWEST AIRLINES")) return "Southwest Airlines";
        if (desc.Contains("NORSE ATLANTIC")) return "Norse Atlantic";
        if (desc.Contains("WEIXIN") || desc.Contains("SUPERBUY")) return "Superbuy (WeChat Pay)";
        if (desc.Contains("DHGATE")) return "DHgate";
        if (desc.Contains("IN-N-OUT")) return "In-N-Out Burger";
        if (desc.Contains("CHIPOTLE")) return "Chipotle";
        if (desc.Contains("CHICK-FIL-A")) return "Chick-fil-A";
        if (desc.Contains("RAISING CANE")) return "Raising Cane's";
        if (desc.Contains("ALBERTSONS")) return "Albertsons";
        if (desc.Contains("EXXON") || desc.Contains("CIRCLE K")) return "Gas Station";
        if (desc.Contains("EREWHON")) return "Erewhon";
        if (desc.Contains("WABA GRILL") || desc.Contains("WABAGRILL")) return "Waba Grill";
        if (desc.Contains("ONERWAY") || desc.Contains("MIDODO")) return "Online Shopping";
        if (desc.Contains("NORDSTROM")) return "Nordstrom Rack";
        if (desc.Contains("COCOBONGO") || desc.Contains("MERCADOPAGO*COCOB")) return "Coco Bongo";
        if (desc.Contains("MANDALA")) return "Mandala Tickets";
        if (desc.Contains("EXPEDIA")) return "Expedia";
        if (desc.Contains("UBER")) return "Uber";

        if (desc.StartsWith("TST*")) description = description[4..].TrimStart();
        else if (desc.StartsWith("SQ *")) description = description[4..].TrimStart();
        else if (desc.StartsWith("TM *")) description = description[4..].TrimStart();
        else if (desc.StartsWith("PY *")) description = description[4..].TrimStart();
        else if (desc.StartsWith("SPO*")) description = description[4..].TrimStart();

        var words = description.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join(" ", words.Take(3));
    }

    private static string CategorizeTransaction(string description)
    {
        var desc = description.ToUpperInvariant();

        if (desc.Contains("AMZN") || desc.Contains("AMAZON") || desc.Contains("KINDLE"))
            return "Amazon";

        if (desc.Contains("ALASKA AIR") || desc.Contains("SOUTHWEST AIR") || desc.Contains("DELTA AIR") ||
            desc.Contains("UNITED AIR") || desc.Contains("AMERICAN AIR") || desc.Contains("JETBLUE") ||
            desc.Contains("SPIRIT AIR") || desc.Contains("FRONTIER AIR") ||
            desc.Contains("NORSE ATLANTIC"))
            return "Travel - Flights";

        if (desc.Contains("UBER") || desc.Contains("LYFT") || desc.Contains("CAB MV") ||
            desc.Contains("DUBAI TAXI") || desc.Contains("NYC FERRY") || desc.Contains("JS TOUR"))
            return "Travel - Rideshare";

        if (desc.Contains("HOTEL") || desc.Contains("MARRIOTT") || desc.Contains("HILTON") ||
            desc.Contains("HYATT") || desc.Contains("AIRBNB") || desc.Contains("JUMEIRAH") ||
            desc.Contains("CHATEAU") || desc.Contains("RESORT") || desc.Contains("INN") ||
            desc.Contains("AMEX FINE HOTELS") || desc.Contains("FINE HOTELS"))
            return "Travel - Hotels";

        if (desc.Contains("EXPEDIA") || desc.Contains("BOOKING.COM") || desc.Contains("PRICELINE") ||
            desc.Contains("LIZBETH MARKET"))
            return "Travel - Booking";

        if (desc.Contains("GETYOURGUIDE") || desc.Contains("POPEYEJETSKI") ||
            desc.Contains("SKY VIEW") || desc.Contains("SKY HAWKS") ||
            desc.Contains("DTC VIP") || desc.Contains("IMI IBIZA") || desc.Contains("ALBAIK") ||
            desc.Contains("TAPA E-TICKET") || desc.Contains("COCOBONGO") ||
            desc.Contains("MANDALA") || desc.Contains("TOP OF THE ROCK") ||
            desc.Contains("SUMMIT ONE") || desc.Contains("CLEAR") ||
            desc.Contains("PROCLUB") || desc.Contains("PRO CLUB"))
            return "Travel - Activities";

        if (desc.Contains("CHIPOTLE") || desc.Contains("IN-N-OUT") || desc.Contains("TST*") ||
            desc.Contains("RAISING CANE") || desc.Contains("CHICK-FIL-A") ||
            desc.Contains("OLIVE GARDEN") || desc.Contains("MCDONALD") ||
            desc.Contains("STARBUCKS") || desc.Contains("CAFE") || desc.Contains("BURGER") ||
            desc.Contains("PIZZA") || desc.Contains("HAAGEN DAZS") || desc.Contains("PIEOLOGY") ||
            desc.Contains("PAPACHINOS") || desc.Contains("TWISTED SAGE") ||
            desc.Contains("LETTUCE TOSS") || desc.Contains("BAKER'S") ||
            desc.Contains("ANDYS BURGERS") || desc.Contains("MAGIC WOK") ||
            desc.Contains("BRAVO BURGERS") || desc.Contains("TROYS BURGERS") ||
            desc.Contains("SUBWAY") || desc.Contains("WAHOO") || desc.Contains("FISH TACO") ||
            desc.Contains("WABA GRILL") || desc.Contains("WABAGRILL") ||
            desc.Contains("OLO*WABA") || desc.Contains("PERCH") || desc.Contains("ARCHIBALD") ||
            desc.Contains("EGGBRED") || desc.Contains("GENGIS") || desc.Contains("PRESOTEA") ||
            desc.Contains("RESTAURANT") || desc.Contains("KITCHEN") || desc.Contains("GRILLE") ||
            desc.Contains("BAKERY") || desc.Contains("PANINI") || desc.Contains("BREADS") ||
            desc.Contains("BREAD &") || desc.Contains("OJOS LOCOS") || desc.Contains("SNACK"))
            return "Dining";

        if (desc.Contains("EXXON") || desc.Contains("CIRCLE K") || desc.Contains("SHELL") ||
            desc.Contains("CHEVRON") || desc.Contains("ARCO") || desc.Contains("SMOG") ||
            desc.Contains("US SMOG") || desc.Contains("UNION 76") || desc.Contains("76 GAS") ||
            desc.Contains("ROCKET") || desc.Contains("GAS STATION") || desc.Contains("FUEL"))
            return "Auto & Gas";

        if (desc.Contains("ALBERTSONS") || desc.Contains("RALPHS") ||
            desc.Contains("WHOLE FOODS") || desc.Contains("TRADER JOE") ||
            desc.Contains("COUNTRY STORE") || desc.Contains("EREWHON") ||
            desc.Contains("SQ *SNACK STOP"))
            return "Groceries";

        if (desc.Contains("KAISER") || desc.Contains("KP RX") || desc.Contains("CVS") ||
            desc.Contains("WALGREEN") || desc.Contains("PHARMACY") ||
            desc.Contains("MEDICAL") || desc.Contains("HOSPITAL") || desc.Contains("CLINIC"))
            return "Healthcare";

        if (desc.Contains("BEST BUY") || desc.Contains("APPLE STORE") ||
            desc.Contains("OCULUS") || desc.Contains("META QUEST") ||
            desc.Contains("OPENAI") || desc.Contains("CLAUDE.AI") ||
            desc.Contains("MICROSOFT") || desc.Contains("CHATGPT") || desc.Contains("HP.COM") ||
            desc.Contains("MUSE AI") || desc.Contains("AZURE") || desc.Contains("INSTA-HD") ||
            desc.Contains("NAMECHEAP") || desc.Contains("NAME-CHEAP") ||
            desc.Contains("FAIMOID") || desc.Contains("DISNEY PLUS") ||
            desc.Contains("DISNEY ECOM") || desc.Contains("ESPN") ||
            desc.Contains("MS STUDIO") || desc.Contains("MS CM "))
            return "Electronics & Tech";

        if (desc.Contains("DHGATE") || desc.Contains("WEIXIN") || desc.Contains("SUPERBUY") ||
            desc.Contains("FIVE BELOW") || desc.Contains("MACYS") || desc.Contains("MACY'S") ||
            desc.Contains("NORDSTROM") || desc.Contains("ROSS DRESS") || desc.Contains("TARGET") ||
            desc.Contains("WALMART") || desc.Contains("CALLAWAY") || desc.Contains("AIRWALX") ||
            desc.Contains("FINTECHNET") || desc.Contains("BATH & BODY") || desc.Contains("ZTL*") ||
            desc.Contains("ONERWAY") || desc.Contains("MIDODO"))
            return "Shopping";

        if (desc.Contains("TICKETMASTER") || desc.Contains("CLAREMONT WILDERNESS") ||
            desc.Contains("BIG BEAR") || desc.Contains("LA KINGS") ||
            desc.Contains("BLUMON") || desc.Contains("CONCERT") || desc.Contains("SHOWS"))
            return "Entertainment";

        if (desc.Contains("UPS STORE") || desc.Contains("FEDEX"))
            return "Shipping";

        if (desc.Contains("BARBER") || desc.Contains("SALON") || desc.Contains("ROYAL TREATMENT") ||
            desc.Contains("ZIA THREADING") || desc.Contains("THREADING") || desc.Contains("NAILS") ||
            desc.Contains("SPA") || desc.Contains("BEAUTY") || desc.Contains("SERRANOS") ||
            desc.Contains("DELUXURY") || desc.Contains("KAYA") || desc.Contains("PATRNS") ||
            desc.Contains("TAILOR") || desc.Contains("CLEANERS") || desc.Contains("NORA "))
            return "Personal Care";

        if (desc.Contains("FOREIGN TRANSACTION FEE"))
            return "Foreign Transaction Fees";

        if (desc.Contains("MEMBERSHIP FEE") || desc.Contains("ANNUAL FEE") ||
            desc.Contains("RENEWAL FEE"))
            return "Fees & Memberships";

        return "Other";
    }
}
