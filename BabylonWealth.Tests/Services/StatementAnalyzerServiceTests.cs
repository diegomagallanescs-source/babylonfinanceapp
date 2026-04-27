using BabylonWealth.Services;

namespace BabylonWealth.Tests.Services;

/// <summary>
/// Integration tests against real Chase PDF statements.
/// Paths point to the Downloads folder where the user's test PDFs live.
/// These are not checked in — skip gracefully if files are absent.
/// </summary>
public class StatementAnalyzerServiceTests
{
    private readonly StatementAnalyzerService _sut = new();

    private const string Pdf2271Jan2025 = @"C:\Users\diego\Downloads\20250106-statements-2271-.pdf";
    private const string Pdf2271Mar2026 = @"C:\Users\diego\Downloads\20260306-statements-2271-.pdf";
    private const string Pdf0890Feb2025 = @"C:\Users\diego\Downloads\20250228-statements-0890-.pdf";

    // ── 2271 January 2025 (full statement, 80+ transactions) ─────

    [Fact]
    public void Analyze_Chase2271Jan2025_DetectsCorrectAccount()
    {
        Skip_IfMissing(Pdf2271Jan2025);

        var result = RunSingle(Pdf2271Jan2025, "2271-jan.pdf");

        Assert.Contains("2271", result.AccountsDetected);
    }

    [Fact]
    public void Analyze_Chase2271Jan2025_HasTransactions()
    {
        Skip_IfMissing(Pdf2271Jan2025);

        var result = RunSingle(Pdf2271Jan2025, "2271-jan.pdf");

        Assert.True(result.HasTransactions, "Expected transactions but found none.");
        Assert.True(result.TransactionCount > 0, $"TransactionCount should be > 0, got {result.TransactionCount}");
    }

    [Fact]
    public void Analyze_Chase2271Jan2025_TotalMatchesStatementPurchases()
    {
        Skip_IfMissing(Pdf2271Jan2025);

        var result = RunSingle(Pdf2271Jan2025, "2271-jan.pdf");

        // Statement shows Purchases +$5,502.66 and Fees Charged +$33.02
        // Our total should be in that ballpark (purchases + fees).
        // We allow a small tolerance for parsing edge cases.
        Assert.True(result.TotalPurchases > 5000m,
            $"Expected TotalPurchases > $5000, got ${result.TotalPurchases}");
        Assert.True(result.TotalPurchases < 6000m,
            $"Expected TotalPurchases < $6000, got ${result.TotalPurchases}");
    }

    [Fact]
    public void Analyze_Chase2271Jan2025_CategorizesAmazonCorrectly()
    {
        Skip_IfMissing(Pdf2271Jan2025);

        var result = RunSingle(Pdf2271Jan2025, "2271-jan.pdf");

        var amazon = result.CategoryBreakdown.FirstOrDefault(c => c.Category == "Amazon");
        Assert.NotNull(amazon);
        Assert.True(amazon.Total > 0, "Amazon category total should be > 0");
        Assert.True(amazon.Count >= 5, $"Expected at least 5 Amazon transactions, got {amazon.Count}");
    }

    [Fact]
    public void Analyze_Chase2271Jan2025_CategorizesFlightsCorrectly()
    {
        Skip_IfMissing(Pdf2271Jan2025);

        var result = RunSingle(Pdf2271Jan2025, "2271-jan.pdf");

        var flights = result.CategoryBreakdown.FirstOrDefault(c => c.Category == "Travel - Flights");
        Assert.NotNull(flights);
        // 4 Alaska Air tickets at $377.14 each = $1,508.56
        Assert.True(flights.Total > 1400m, $"Expected flights total > $1400, got ${flights.Total}");
    }

    [Fact]
    public void Analyze_Chase2271Jan2025_ExcludesPayments()
    {
        Skip_IfMissing(Pdf2271Jan2025);

        var result = RunSingle(Pdf2271Jan2025, "2271-jan.pdf");

        var paymentTx = result.Transactions
            .Where(t => t.Description.Contains("Payment", StringComparison.OrdinalIgnoreCase))
            .ToList();

        Assert.Empty(paymentTx);
    }

    [Fact]
    public void Analyze_Chase2271Jan2025_InfersCorrectPeriod()
    {
        Skip_IfMissing(Pdf2271Jan2025);

        var result = RunSingle(Pdf2271Jan2025, "2271-jan.pdf");

        // Closing date is 01/06/25 → January 2025
        Assert.Equal(1, result.InferredMonth);
        Assert.Equal(2025, result.InferredYear);
    }

    [Fact]
    public void Analyze_Chase2271Jan2025_TopMerchantsNotEmpty()
    {
        Skip_IfMissing(Pdf2271Jan2025);

        var result = RunSingle(Pdf2271Jan2025, "2271-jan.pdf");

        Assert.NotEmpty(result.TopMerchants);
        // Amazon and Alaska Airlines should both appear (both have significant spend)
        var names = result.TopMerchants.Select(m => m.Name).ToList();
        Assert.Contains("Amazon", names);
        Assert.Contains("Alaska Airlines", names);
    }

    [Fact]
    public void Analyze_Chase2271Jan2025_PrintFullReport()
    {
        Skip_IfMissing(Pdf2271Jan2025);

        var result = RunSingle(Pdf2271Jan2025, "2271-jan.pdf");

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("\n=== STATEMENT ANALYSIS REPORT ===");
        sb.AppendLine($"Period      : {result.StatementPeriod}");
        sb.AppendLine($"Accounts    : {string.Join(", ", result.AccountsDetected)}");
        sb.AppendLine($"Transactions: {result.TransactionCount}");
        sb.AppendLine($"Total Spend : ${result.TotalPurchases:N2}");

        sb.AppendLine("\n--- Category Breakdown ---");
        foreach (var c in result.CategoryBreakdown)
            sb.AppendLine($"  {c.Category,-35} ${c.Total,8:N2}  ({c.Count} txns, {c.Percentage}%)");

        sb.AppendLine("\n--- Top Merchants ---");
        foreach (var m in result.TopMerchants)
            sb.AppendLine($"  {m.Name,-35} ${m.Total,8:N2}  ({m.Count} txns)");

        if (result.ParseWarnings.Count > 0)
        {
            sb.AppendLine("\n--- Warnings ---");
            foreach (var w in result.ParseWarnings) sb.AppendLine($"  {w}");
        }

        File.WriteAllText(Path.Combine(Path.GetTempPath(), "babylon_parse_report.txt"), sb.ToString());
        Assert.True(true);
    }

    // ── 2271 March 2026 (ZERO purchases, only interest + payment) ─

    [Fact]
    public void Analyze_Chase2271Mar2026_ZeroPurchases()
    {
        Skip_IfMissing(Pdf2271Mar2026);

        var result = RunSingle(Pdf2271Mar2026, "2271-mar2026.pdf");

        Assert.False(result.HasTransactions,
            $"Expected 0 transactions but got {result.TransactionCount}");
        Assert.Equal(0, result.TransactionCount);
        Assert.Equal(0m, result.TotalPurchases);
    }

    [Fact]
    public void Analyze_Chase2271Mar2026_ExcludesInterestCharge()
    {
        Skip_IfMissing(Pdf2271Mar2026);

        var result = RunSingle(Pdf2271Mar2026, "2271-mar2026.pdf");

        var interestTx = result.Transactions
            .Where(t => t.Description.Contains("INTEREST", StringComparison.OrdinalIgnoreCase))
            .ToList();

        Assert.Empty(interestTx);
    }

    // ── 0890 February 2025 (ZERO purchases, only payment) ────────

    [Fact]
    public void Analyze_Chase0890Feb2025_ZeroPurchases()
    {
        Skip_IfMissing(Pdf0890Feb2025);

        var result = RunSingle(Pdf0890Feb2025, "0890-feb2025.pdf");

        Assert.False(result.HasTransactions,
            $"Expected 0 transactions but got {result.TransactionCount}");
        Assert.Equal(0, result.TransactionCount);
        Assert.Equal(0m, result.TotalPurchases);
    }

    [Fact]
    public void Analyze_Chase0890Feb2025_DetectsCorrectAccount()
    {
        Skip_IfMissing(Pdf0890Feb2025);

        var result = RunSingle(Pdf0890Feb2025, "0890-feb2025.pdf");

        Assert.Contains("0890", result.AccountsDetected);
    }

    // ── Multi-file: pool 2271 Jan 2025 + 0890 Feb 2025 ───────────

    [Fact]
    public void Analyze_TwoFiles_PoolsTransactionsAndDetectsBothAccounts()
    {
        Skip_IfMissing(Pdf2271Jan2025, Pdf0890Feb2025);

        var inputs = new[]
        {
            (File.OpenRead(Pdf2271Jan2025) as Stream, "2271-jan.pdf"),
            (File.OpenRead(Pdf0890Feb2025) as Stream, "0890-feb.pdf"),
        };

        var result = _sut.Analyze(inputs);

        Assert.Contains("2271", result.AccountsDetected);
        Assert.Contains("0890", result.AccountsDetected);
        // Total should match just the 2271 Jan statement (0890 has $0)
        Assert.True(result.TotalPurchases > 5000m);
    }

    // ── Amex Blue Business Plus — March 2026 ─────────────────────

    private const string PdfAmexMar2026 = @"C:\Users\diego\Downloads\2026-03-27.pdf";

    /// <summary>Dumps all extracted PDF lines to a temp file for debugging.</summary>
    [Fact]
    public void Debug_AmexMar2026_DumpRawLines()
    {
        Skip_IfMissing(PdfAmexMar2026);

        var lines = new System.Text.StringBuilder();
        using var doc = UglyToad.PdfPig.PdfDocument.Open(PdfAmexMar2026);
        int pageNum = 0;
        foreach (var page in doc.GetPages())
        {
            pageNum++;
            lines.AppendLine($"\n=== PAGE {pageNum} ===");
            var lineGroups = page.GetWords()
                .GroupBy(w => (int)Math.Round(w.BoundingBox.Bottom))
                .OrderByDescending(g => g.Key)
                .Select(g => string.Join(" ", g.OrderBy(w => w.BoundingBox.Left).Select(w => w.Text)));
            foreach (var l in lineGroups)
                lines.AppendLine(l);
        }

        File.WriteAllText(Path.Combine(Path.GetTempPath(), "babylon_amex_rawlines.txt"), lines.ToString());
        Assert.True(true);
    }

    [Fact]
    public void Analyze_AmexMar2026_DetectsAccount()
    {
        Skip_IfMissing(PdfAmexMar2026);

        var result = RunSingle(PdfAmexMar2026, "amex-mar2026.pdf");

        Assert.NotEmpty(result.AccountsDetected);
        // Amex account ending 7-41007 → normalized to "41007"
        Assert.Contains("41007", result.AccountsDetected);
    }

    [Fact]
    public void Analyze_AmexMar2026_InfersCorrectPeriod()
    {
        Skip_IfMissing(PdfAmexMar2026);

        var result = RunSingle(PdfAmexMar2026, "amex-mar2026.pdf");

        // Closing date 03/27/26 → March 2026
        Assert.Equal(3, result.InferredMonth);
        Assert.Equal(2026, result.InferredYear);
    }

    [Fact]
    public void Analyze_AmexMar2026_HasTransactions()
    {
        Skip_IfMissing(PdfAmexMar2026);

        var result = RunSingle(PdfAmexMar2026, "amex-mar2026.pdf");

        Assert.True(result.HasTransactions, "Expected transactions but found none.");
        Assert.True(result.TransactionCount > 0, $"TransactionCount should be > 0, got {result.TransactionCount}");
    }

    [Fact]
    public void Analyze_AmexMar2026_TotalMatchesStatementNewCharges()
    {
        Skip_IfMissing(PdfAmexMar2026);

        var result = RunSingle(PdfAmexMar2026, "amex-mar2026.pdf");

        // Statement New Charges: ~$4,432.60 + FTFs $4.17
        Assert.True(result.TotalPurchases > 4000m,
            $"Expected TotalPurchases > $4000, got ${result.TotalPurchases}");
        Assert.True(result.TotalPurchases < 5000m,
            $"Expected TotalPurchases < $5000, got ${result.TotalPurchases}");
    }

    [Fact]
    public void Analyze_AmexMar2026_ExcludesPayments()
    {
        Skip_IfMissing(PdfAmexMar2026);

        var result = RunSingle(PdfAmexMar2026, "amex-mar2026.pdf");

        var paymentTx = result.Transactions
            .Where(t => t.Description.Contains("PAYMENT", StringComparison.OrdinalIgnoreCase) ||
                        t.Description.Contains("Payment", StringComparison.OrdinalIgnoreCase))
            .ToList();

        Assert.Empty(paymentTx);
    }

    [Fact]
    public void Analyze_AmexMar2026_PrintFullReport()
    {
        Skip_IfMissing(PdfAmexMar2026);

        var result = RunSingle(PdfAmexMar2026, "amex-mar2026.pdf");

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("\n=== AMEX STATEMENT ANALYSIS REPORT ===");
        sb.AppendLine($"Period      : {result.StatementPeriod}");
        sb.AppendLine($"Accounts    : {string.Join(", ", result.AccountsDetected)}");
        sb.AppendLine($"Transactions: {result.TransactionCount}");
        sb.AppendLine($"Total Spend : ${result.TotalPurchases:N2}");

        sb.AppendLine("\n--- Category Breakdown ---");
        foreach (var c in result.CategoryBreakdown)
            sb.AppendLine($"  {c.Category,-35} ${c.Total,8:N2}  ({c.Count} txns, {c.Percentage}%)");

        sb.AppendLine("\n--- Top Merchants ---");
        foreach (var m in result.TopMerchants)
            sb.AppendLine($"  {m.Name,-35} ${m.Total,8:N2}  ({m.Count} txns)");

        sb.AppendLine("\n--- All Transactions ---");
        foreach (var t in result.Transactions)
            sb.AppendLine($"  {t.Date}  {t.Description,-45} ${t.Amount,8:N2}  [{t.Category}]");

        if (result.ParseWarnings.Count > 0)
        {
            sb.AppendLine("\n--- Warnings ---");
            foreach (var w in result.ParseWarnings) sb.AppendLine($"  {w}");
        }

        File.WriteAllText(Path.Combine(Path.GetTempPath(), "babylon_amex_report.txt"), sb.ToString());
        Assert.True(true);
    }

    // ── Spending Report PDF ───────────────────────────────────────

    private const string PdfSpendingReport = @"C:\Users\diego\Downloads\Spending Report PDF.pdf";

    /// <summary>Dumps all extracted PDF lines to a temp file for debugging.</summary>
    [Fact]
    public void Debug_SpendingReportPDF_DumpRawLines()
    {
        Skip_IfMissing(PdfSpendingReport);

        var lines = new System.Text.StringBuilder();
        using var doc = UglyToad.PdfPig.PdfDocument.Open(PdfSpendingReport);
        int pageNum = 0;
        foreach (var page in doc.GetPages())
        {
            pageNum++;
            lines.AppendLine($"\n=== PAGE {pageNum} ===");
            var lineGroups = page.GetWords()
                .GroupBy(w => (int)Math.Round(w.BoundingBox.Bottom))
                .OrderByDescending(g => g.Key)
                .Select(g => string.Join(" ", g.OrderBy(w => w.BoundingBox.Left).Select(w => w.Text)));
            foreach (var l in lineGroups)
                lines.AppendLine(l);
        }

        File.WriteAllText(Path.Combine(Path.GetTempPath(), "babylon_spending_report_lines.txt"), lines.ToString());
        Assert.True(true);
    }

    // ── Year End Summary 2025 ─────────────────────────────────────

    private const string PdfYearEndSummary = @"C:\Users\diego\Downloads\YearEndSummary_2025 (2).pdf";

    /// <summary>Dumps all extracted PDF lines to a temp file for debugging.</summary>
    [Fact]
    public void Debug_YearEndSummary_DumpRawLines()
    {
        Skip_IfMissing(PdfYearEndSummary);

        var lines = new System.Text.StringBuilder();
        using var doc = UglyToad.PdfPig.PdfDocument.Open(PdfYearEndSummary);
        int pageNum = 0;
        foreach (var page in doc.GetPages())
        {
            pageNum++;
            lines.AppendLine($"\n=== PAGE {pageNum} ===");
            var lineGroups = page.GetWords()
                .GroupBy(w => (int)Math.Round(w.BoundingBox.Bottom))
                .OrderByDescending(g => g.Key)
                .Select(g => string.Join(" ", g.OrderBy(w => w.BoundingBox.Left).Select(w => w.Text)));
            foreach (var l in lineGroups)
                lines.AppendLine(l);
        }

        File.WriteAllText(Path.Combine(Path.GetTempPath(), "babylon_yearend_lines.txt"), lines.ToString());
        Assert.True(true);
    }

    // ── Chase Spending Report 4974 (Full Year 2025) ──────────────

    [Fact]
    public void Analyze_ChaseSpendingReport_DetectsYearEnd()
    {
        Skip_IfMissing(PdfSpendingReport);
        var result = RunSingle(PdfSpendingReport, "spending-report.pdf");
        Assert.Equal("YearEnd", result.ReportType);
        Assert.Equal(2025, result.InferredYear);
        Assert.Null(result.InferredMonth);
    }

    [Fact]
    public void Analyze_ChaseSpendingReport_DetectsAccount()
    {
        Skip_IfMissing(PdfSpendingReport);
        var result = RunSingle(PdfSpendingReport, "spending-report.pdf");
        Assert.Contains("4974", result.AccountsDetected);
    }

    [Fact]
    public void Analyze_ChaseSpendingReport_TotalMatchesStatement()
    {
        Skip_IfMissing(PdfSpendingReport);
        var result = RunSingle(PdfSpendingReport, "spending-report.pdf");
        // Statement grand total: $1,040.41
        Assert.True(result.TotalPurchases > 900m, $"Expected > $900, got ${result.TotalPurchases}");
        Assert.True(result.TotalPurchases < 1200m, $"Expected < $1200, got ${result.TotalPurchases}");
    }

    [Fact]
    public void Analyze_ChaseSpendingReport_HasMonthlyBreakdown()
    {
        Skip_IfMissing(PdfSpendingReport);
        var result = RunSingle(PdfSpendingReport, "spending-report.pdf");
        Assert.NotEmpty(result.MonthlyBreakdown);
    }

    [Fact]
    public void Analyze_ChaseSpendingReport_PrintReport()
    {
        Skip_IfMissing(PdfSpendingReport);
        var result = RunSingle(PdfSpendingReport, "spending-report.pdf");
        PrintReport(result, "babylon_spending_report_analysis.txt");
        Assert.True(true);
    }

    // ── Amex Year-End Summary 2025 (Platinum 42006) ───────────────

    [Fact]
    public void Analyze_AmexYearEnd_DetectsYearEnd()
    {
        Skip_IfMissing(PdfYearEndSummary);
        var result = RunSingle(PdfYearEndSummary, "yearend-2025.pdf");
        Assert.Equal("YearEnd", result.ReportType);
        Assert.Equal(2025, result.InferredYear);
        Assert.Null(result.InferredMonth);
    }

    [Fact]
    public void Analyze_AmexYearEnd_DetectsAccount()
    {
        Skip_IfMissing(PdfYearEndSummary);
        var result = RunSingle(PdfYearEndSummary, "yearend-2025.pdf");
        Assert.Contains("42006", result.AccountsDetected);
    }

    [Fact]
    public void Analyze_AmexYearEnd_HasTransactions()
    {
        Skip_IfMissing(PdfYearEndSummary);
        var result = RunSingle(PdfYearEndSummary, "yearend-2025.pdf");
        Assert.True(result.HasTransactions, "Expected transactions but found none.");
        Assert.True(result.TransactionCount > 20, $"Expected > 20 transactions, got {result.TransactionCount}");
    }

    [Fact]
    public void Analyze_AmexYearEnd_TotalMatchesStatement()
    {
        Skip_IfMissing(PdfYearEndSummary);
        var result = RunSingle(PdfYearEndSummary, "yearend-2025.pdf");
        // Amex year-end gross charges ~$17,033 but credits/benefits reduce net.
        // Our total excludes Platinum credits — expect roughly $15,000–$19,000.
        Assert.True(result.TotalPurchases > 14000m, $"Expected > $14000, got ${result.TotalPurchases}");
        Assert.True(result.TotalPurchases < 20000m, $"Expected < $20000, got ${result.TotalPurchases}");
    }

    [Fact]
    public void Analyze_AmexYearEnd_HasMonthlyBreakdown()
    {
        Skip_IfMissing(PdfYearEndSummary);
        var result = RunSingle(PdfYearEndSummary, "yearend-2025.pdf");
        Assert.NotEmpty(result.MonthlyBreakdown);
        // Should cover multiple months
        Assert.True(result.MonthlyBreakdown.Count >= 6, $"Expected months >= 6, got {result.MonthlyBreakdown.Count}");
    }

    [Fact]
    public void Analyze_AmexYearEnd_PrintReport()
    {
        Skip_IfMissing(PdfYearEndSummary);
        var result = RunSingle(PdfYearEndSummary, "yearend-2025.pdf");
        PrintReport(result, "babylon_yearend_analysis.txt");
        Assert.True(true);
    }

    // ── Combined year-end: Chase Spending Report + Amex Year-End ─

    [Fact]
    public void Analyze_BothYearEnds_CombinesSpend()
    {
        Skip_IfMissing(PdfSpendingReport, PdfYearEndSummary);
        var inputs = new[]
        {
            (File.OpenRead(PdfSpendingReport) as Stream, "spending-report.pdf"),
            (File.OpenRead(PdfYearEndSummary) as Stream, "yearend-2025.pdf"),
        };
        var result = _sut.Analyze(inputs);
        Assert.Equal("YearEnd", result.ReportType);
        Assert.Equal(2025, result.InferredYear);
        // Combined total should be Chase ~$1,040 + Amex ~$17k+ = > $15,000
        Assert.True(result.TotalPurchases > 14000m, $"Expected combined > $14000, got ${result.TotalPurchases}");
        Assert.NotEmpty(result.MonthlyBreakdown);
    }

    [Fact]
    public void Analyze_BothYearEnds_PrintCombinedReport()
    {
        Skip_IfMissing(PdfSpendingReport, PdfYearEndSummary);
        var inputs = new[]
        {
            (File.OpenRead(PdfSpendingReport) as Stream, "spending-report.pdf"),
            (File.OpenRead(PdfYearEndSummary) as Stream, "yearend-2025.pdf"),
        };
        var result = _sut.Analyze(inputs);
        PrintReport(result, "babylon_yearend_combined.txt");
        Assert.True(true);
    }

    // ── Multi-file: Chase 2271 Jan 2025 + Amex Mar 2026 ──────────

    [Fact]
    public void Analyze_ChaseAndAmex_PoolsBothAccounts()
    {
        Skip_IfMissing(Pdf2271Jan2025, PdfAmexMar2026);

        var inputs = new[]
        {
            (File.OpenRead(Pdf2271Jan2025) as Stream, "2271-jan.pdf"),
            (File.OpenRead(PdfAmexMar2026) as Stream, "amex-mar2026.pdf"),
        };

        var result = _sut.Analyze(inputs);

        Assert.Contains("2271", result.AccountsDetected);
        Assert.Contains("41007", result.AccountsDetected);
        // Combined: Chase ~$5,535 + Amex ~$4,436 = ~$9,971
        Assert.True(result.TotalPurchases > 9000m,
            $"Expected combined total > $9000, got ${result.TotalPurchases}");
    }

    [Fact]
    public void Analyze_ChaseAndAmex_PrintCombinedReport()
    {
        Skip_IfMissing(Pdf2271Jan2025, PdfAmexMar2026);

        var inputs = new[]
        {
            (File.OpenRead(Pdf2271Jan2025) as Stream, "2271-jan.pdf"),
            (File.OpenRead(PdfAmexMar2026) as Stream, "amex-mar2026.pdf"),
        };

        var result = _sut.Analyze(inputs);

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("\n=== COMBINED CHASE + AMEX REPORT ===");
        sb.AppendLine($"Period      : {result.StatementPeriod}");
        sb.AppendLine($"Accounts    : {string.Join(", ", result.AccountsDetected)}");
        sb.AppendLine($"Transactions: {result.TransactionCount}");
        sb.AppendLine($"Total Spend : ${result.TotalPurchases:N2}");

        sb.AppendLine("\n--- Combined Category Breakdown ---");
        foreach (var c in result.CategoryBreakdown)
            sb.AppendLine($"  {c.Category,-35} ${c.Total,8:N2}  ({c.Count} txns, {c.Percentage}%)");

        sb.AppendLine("\n--- Top Merchants (across both cards) ---");
        foreach (var m in result.TopMerchants)
            sb.AppendLine($"  {m.Name,-35} ${m.Total,8:N2}  ({m.Count} txns)");

        File.WriteAllText(Path.Combine(Path.GetTempPath(), "babylon_combined_report.txt"), sb.ToString());
        Assert.True(true);
    }

    // ── Checking Account PDFs ─────────────────────────────────────

    private const string PdfChaseChecking2685 = @"C:\Users\diego\Downloads\20260415-statements-2685-.pdf";
    private const string PdfSoFiChecking      = @"C:\Users\diego\Downloads\533f9287-599f-4f92-b4be-7f29e1c30a74.pdf";
    private const string PdfBofAChecking      = @"C:\Users\diego\Downloads\eStmt_2026-03-26.pdf";

    private readonly BabylonWealth.Services.CheckingStatementAnalyzerService _checkingSut = new();

    [Fact]
    public void Debug_ChaseChecking2685_DumpRawLines()
    {
        Skip_IfMissing(PdfChaseChecking2685);
        DumpPdfLines(PdfChaseChecking2685, "babylon_chase_checking_lines.txt");
        Assert.True(true);
    }

    [Fact]
    public void Debug_SoFiChecking_DumpRawLines()
    {
        Skip_IfMissing(PdfSoFiChecking);
        DumpPdfLines(PdfSoFiChecking, "babylon_sofi_checking_lines.txt");
        Assert.True(true);
    }

    [Fact]
    public void Debug_BofAChecking_DumpRawLines()
    {
        Skip_IfMissing(PdfBofAChecking);
        DumpPdfLines(PdfBofAChecking, "babylon_bofa_checking_lines.txt");
        Assert.True(true);
    }

    // ── Chase Checking 2685 ───────────────────────────────────────

    [Fact]
    public void Analyze_ChaseChecking2685_DetectsAccount()
    {
        Skip_IfMissing(PdfChaseChecking2685);
        var result = RunChecking(PdfChaseChecking2685, "chase-checking.pdf");
        Assert.Contains("2685", result.AccountsDetected);
    }

    [Fact]
    public void Analyze_ChaseChecking2685_HasTransactions()
    {
        Skip_IfMissing(PdfChaseChecking2685);
        var result = RunChecking(PdfChaseChecking2685, "chase-checking.pdf");
        Assert.True(result.TransactionCount > 5, $"Expected > 5 transactions, got {result.TransactionCount}");
    }

    [Fact]
    public void Analyze_ChaseChecking2685_MoneyInMatchesStatement()
    {
        Skip_IfMissing(PdfChaseChecking2685);
        var result = RunChecking(PdfChaseChecking2685, "chase-checking.pdf");
        // Statement shows $18,363.79 total deposits; self-Zelle transfers (~$2,650) are excluded
        Assert.True(result.TotalMoneyIn > 14000m, $"Expected TotalMoneyIn > $14000, got ${result.TotalMoneyIn}");
        Assert.True(result.TotalMoneyIn < 18000m, $"Expected TotalMoneyIn < $18000, got ${result.TotalMoneyIn}");
    }

    [Fact]
    public void Analyze_ChaseChecking2685_MoneyOutMatchesStatement()
    {
        Skip_IfMissing(PdfChaseChecking2685);
        var result = RunChecking(PdfChaseChecking2685, "chase-checking.pdf");
        // Statement shows withdrawals + electronic = $16,959.95
        Assert.True(result.TotalMoneyOut > 15000m, $"Expected TotalMoneyOut > $15000, got ${result.TotalMoneyOut}");
        Assert.True(result.TotalMoneyOut < 19000m, $"Expected TotalMoneyOut < $19000, got ${result.TotalMoneyOut}");
    }

    [Fact]
    public void Analyze_ChaseChecking2685_HasCreditCardPaymentCategory()
    {
        Skip_IfMissing(PdfChaseChecking2685);
        var result = RunChecking(PdfChaseChecking2685, "chase-checking.pdf");
        Assert.Contains(result.MoneyOutBreakdown, c => c.Category == "Credit Card Payment");
    }

    [Fact]
    public void Analyze_ChaseChecking2685_PrintReport()
    {
        Skip_IfMissing(PdfChaseChecking2685);
        var result = RunChecking(PdfChaseChecking2685, "chase-checking.pdf");
        PrintCheckingReport(result, "babylon_chase_checking_report.txt");
        Assert.True(true);
    }

    // ── SoFi Checking 1820 ────────────────────────────────────────

    [Fact]
    public void Analyze_SoFiChecking_DetectsAccount()
    {
        Skip_IfMissing(PdfSoFiChecking);
        var result = RunChecking(PdfSoFiChecking, "sofi-checking.pdf");
        Assert.Contains("1820", result.AccountsDetected);
    }

    [Fact]
    public void Analyze_SoFiChecking_HasTransactions()
    {
        Skip_IfMissing(PdfSoFiChecking);
        var result = RunChecking(PdfSoFiChecking, "sofi-checking.pdf");
        Assert.True(result.TransactionCount > 0, "Expected SoFi transactions");
    }

    [Fact]
    public void Analyze_SoFiChecking_PayrollDetected()
    {
        Skip_IfMissing(PdfSoFiChecking);
        var result = RunChecking(PdfSoFiChecking, "sofi-checking.pdf");
        Assert.Contains(result.MoneyInBreakdown, c => c.Category == "Payroll");
    }

    [Fact]
    public void Analyze_SoFiChecking_PrintReport()
    {
        Skip_IfMissing(PdfSoFiChecking);
        var result = RunChecking(PdfSoFiChecking, "sofi-checking.pdf");
        PrintCheckingReport(result, "babylon_sofi_checking_report.txt");
        Assert.True(true);
    }

    // ── BofA Checking 0698 ────────────────────────────────────────

    [Fact]
    public void Analyze_BofAChecking_DetectsAccount()
    {
        Skip_IfMissing(PdfBofAChecking);
        var result = RunChecking(PdfBofAChecking, "bofa-checking.pdf");
        Assert.Contains("0698", result.AccountsDetected);
    }

    [Fact]
    public void Analyze_BofAChecking_MoneyInMatchesStatement()
    {
        Skip_IfMissing(PdfBofAChecking);
        var result = RunChecking(PdfBofAChecking, "bofa-checking.pdf");
        // Statement: Deposits $997.14 total; $460 self-Zelle from DIEGO excluded → ~$537
        Assert.True(result.TotalMoneyIn > 400m, $"Expected TotalMoneyIn > $400, got ${result.TotalMoneyIn}");
        Assert.True(result.TotalMoneyIn < 700m, $"Expected TotalMoneyIn < $700, got ${result.TotalMoneyIn}");
    }

    [Fact]
    public void Analyze_BofAChecking_MoneyOutMatchesStatement()
    {
        Skip_IfMissing(PdfBofAChecking);
        var result = RunChecking(PdfBofAChecking, "bofa-checking.pdf");
        // Statement: Withdrawals -813.55 + Service fees -7.50 = $821.05
        Assert.True(result.TotalMoneyOut > 750m, $"Expected TotalMoneyOut > $750, got ${result.TotalMoneyOut}");
        Assert.True(result.TotalMoneyOut < 900m, $"Expected TotalMoneyOut < $900, got ${result.TotalMoneyOut}");
    }

    [Fact]
    public void Analyze_BofAChecking_PrintReport()
    {
        Skip_IfMissing(PdfBofAChecking);
        var result = RunChecking(PdfBofAChecking, "bofa-checking.pdf");
        PrintCheckingReport(result, "babylon_bofa_checking_report.txt");
        Assert.True(true);
    }

    // ── Combined all 3 checking accounts ─────────────────────────

    [Fact]
    public void Analyze_AllChecking_Combined_PrintReport()
    {
        Skip_IfMissing(PdfChaseChecking2685, PdfSoFiChecking, PdfBofAChecking);
        var inputs = new[]
        {
            (File.OpenRead(PdfChaseChecking2685) as Stream, "chase-checking.pdf"),
            (File.OpenRead(PdfSoFiChecking)      as Stream, "sofi-checking.pdf"),
            (File.OpenRead(PdfBofAChecking)       as Stream, "bofa-checking.pdf"),
        };
        var result = _checkingSut.Analyze(inputs);
        PrintCheckingReport(result, "babylon_checking_combined_report.txt");
        Assert.True(result.TransactionCount > 10, $"Combined should have > 10 transactions, got {result.TransactionCount}");
    }

    // ── Checking helpers ──────────────────────────────────────────

    private BabylonWealth.Core.DTOs.Responses.CheckingStatementResponseDto RunChecking(
        string path, string label)
    {
        var inputs = new[] { (File.OpenRead(path) as Stream, label) };
        return _checkingSut.Analyze(inputs);
    }

    private static void PrintCheckingReport(
        BabylonWealth.Core.DTOs.Responses.CheckingStatementResponseDto result,
        string fileName)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"\n=== CHECKING ACCOUNT REPORT ===");
        sb.AppendLine($"Period      : {result.StatementPeriod}");
        sb.AppendLine($"Accounts    : {string.Join(", ", result.AccountsDetected)}");
        sb.AppendLine($"Transactions: {result.TransactionCount}");
        sb.AppendLine($"Money In    : ${result.TotalMoneyIn:N2}");
        sb.AppendLine($"Money Out   : ${result.TotalMoneyOut:N2}");
        sb.AppendLine($"Net Flow    : ${result.NetFlow:N2}");

        sb.AppendLine("\n--- Money In ---");
        foreach (var c in result.MoneyInBreakdown)
            sb.AppendLine($"  {c.Category,-30} ${c.Total,8:N2}  ({c.Count} txns, {c.Percentage}%)");

        sb.AppendLine("\n--- Money Out ---");
        foreach (var c in result.MoneyOutBreakdown)
            sb.AppendLine($"  {c.Category,-30} ${c.Total,8:N2}  ({c.Count} txns, {c.Percentage}%)");

        sb.AppendLine("\n--- All Transactions ---");
        foreach (var t in result.Transactions)
            sb.AppendLine($"  {t.Date,-12} {t.Direction,-4} {t.Description,-50} ${t.Amount,10:N2}  [{t.Category}]");

        if (result.ParseWarnings.Count > 0)
        {
            sb.AppendLine("\n--- Warnings ---");
            foreach (var w in result.ParseWarnings) sb.AppendLine($"  {w}");
        }

        File.WriteAllText(Path.Combine(Path.GetTempPath(), fileName), sb.ToString());
    }

    private static void DumpPdfLines(string path, string outFile)
    {
        var sb = new System.Text.StringBuilder();
        using var doc = UglyToad.PdfPig.PdfDocument.Open(path);
        int pageNum = 0;
        foreach (var page in doc.GetPages())
        {
            pageNum++;
            sb.AppendLine($"\n=== PAGE {pageNum} ===");
            var lineGroups = page.GetWords()
                .GroupBy(w => (int)Math.Round(w.BoundingBox.Bottom))
                .OrderByDescending(g => g.Key)
                .Select(g => string.Join(" ", g.OrderBy(w => w.BoundingBox.Left).Select(w => w.Text)));
            foreach (var l in lineGroups)
                sb.AppendLine(l);
        }
        File.WriteAllText(Path.Combine(Path.GetTempPath(), outFile), sb.ToString());
    }

    // ── Helpers ───────────────────────────────────────────────────

    private BabylonWealth.Core.DTOs.Responses.StatementAnalysisResponseDto RunSingle(
        string path, string label)
    {
        var inputs = new[] { (File.OpenRead(path) as Stream, label) };
        return _sut.Analyze(inputs);
    }

    private static void PrintReport(
        BabylonWealth.Core.DTOs.Responses.StatementAnalysisResponseDto result,
        string fileName)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"\n=== {result.ReportType.ToUpper()} REPORT ===");
        sb.AppendLine($"Period      : {result.StatementPeriod}");
        sb.AppendLine($"Accounts    : {string.Join(", ", result.AccountsDetected)}");
        sb.AppendLine($"Transactions: {result.TransactionCount}");
        sb.AppendLine($"Total Spend : ${result.TotalPurchases:N2}");

        if (result.MonthlyBreakdown.Count > 0)
        {
            sb.AppendLine("\n--- Monthly Breakdown ---");
            foreach (var m in result.MonthlyBreakdown)
                sb.AppendLine($"  {m.MonthName,-12} ${m.Total,8:N2}  ({m.Count} txns)");
        }

        sb.AppendLine("\n--- Category Breakdown ---");
        foreach (var c in result.CategoryBreakdown)
            sb.AppendLine($"  {c.Category,-35} ${c.Total,8:N2}  ({c.Count} txns, {c.Percentage}%)");

        sb.AppendLine("\n--- Top Merchants ---");
        foreach (var m in result.TopMerchants)
            sb.AppendLine($"  {m.Name,-35} ${m.Total,8:N2}  ({m.Count} txns)");

        sb.AppendLine("\n--- All Transactions ---");
        foreach (var t in result.Transactions)
            sb.AppendLine($"  {t.Date}  {t.Description,-50} ${t.Amount,8:N2}  [{t.Category}]");

        if (result.ParseWarnings.Count > 0)
        {
            sb.AppendLine("\n--- Warnings ---");
            foreach (var w in result.ParseWarnings) sb.AppendLine($"  {w}");
        }

        File.WriteAllText(Path.Combine(Path.GetTempPath(), fileName), sb.ToString());
    }

    private static void Skip_IfMissing(params string[] paths)
    {
        foreach (var path in paths)
        {
            if (!File.Exists(path))
                throw new SkipException($"PDF not found at {path} — skipping.");
        }
    }
}

/// <summary>Simple skip mechanism compatible with xUnit (no external package needed).</summary>
public class SkipException : Exception
{
    public SkipException(string reason) : base(reason) { }
}
