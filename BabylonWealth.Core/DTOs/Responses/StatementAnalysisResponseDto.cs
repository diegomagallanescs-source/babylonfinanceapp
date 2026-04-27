namespace BabylonWealth.Core.DTOs.Responses;

public record StatementAnalysisResponseDto
{
    public string StatementPeriod { get; init; } = string.Empty;
    /// <summary>"Monthly" for a single-month statement, "YearEnd" for a full-year report.</summary>
    public string ReportType { get; init; } = "Monthly";
    public int? InferredMonth { get; init; }
    public int? InferredYear { get; init; }
    public List<string> AccountsDetected { get; init; } = [];
    public decimal TotalPurchases { get; init; }
    public int TransactionCount { get; init; }
    public bool HasTransactions { get; init; }
    public List<ParsedTransactionDto> Transactions { get; init; } = [];
    public List<StatementCategoryDto> CategoryBreakdown { get; init; } = [];
    public List<TopMerchantDto> TopMerchants { get; init; } = [];
    /// <summary>Per-month totals. Populated for YearEnd reports; single entry for Monthly.</summary>
    public List<MonthlySpendDto> MonthlyBreakdown { get; init; } = [];
    public List<string> ParseWarnings { get; init; } = [];
}

public record ParsedTransactionDto
{
    public string Date { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public string Category { get; init; } = string.Empty;
    public string? AccountLast4 { get; init; }
    public string? SourceFile { get; init; }
}

public record StatementCategoryDto
{
    public string Category { get; init; } = string.Empty;
    public decimal Total { get; init; }
    public int Count { get; init; }
    public decimal Percentage { get; init; }
}

public record TopMerchantDto
{
    public string Name { get; init; } = string.Empty;
    public decimal Total { get; init; }
    public int Count { get; init; }
}

public record MonthlySpendDto
{
    public int Month { get; init; }
    public string MonthName { get; init; } = string.Empty;
    public decimal Total { get; init; }
    public int Count { get; init; }
}
