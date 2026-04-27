namespace BabylonWealth.Core.DTOs.Requests;

public record SaveStatementSummaryRequest
{
    public int Month { get; init; }
    public int Year { get; init; }
    public decimal TotalSpend { get; init; }
    public int TransactionCount { get; init; }
    public string AccountsIncluded { get; init; } = string.Empty;
    public string? Notes { get; init; }
}
