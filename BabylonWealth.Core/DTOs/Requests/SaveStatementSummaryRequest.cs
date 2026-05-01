namespace BabylonWealth.Core.DTOs.Requests;

public record SaveStatementSummaryRequest
{
    public int Month { get; init; }
    public int Year { get; init; }
    public decimal TotalSpend { get; init; }
    public int TransactionCount { get; init; }
    public string AccountsIncluded { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public decimal? NecessitiesSpend { get; init; }
    public decimal? TravelSpend { get; init; }
    public decimal? SavingsSpend { get; init; }
    public decimal? ShoppingSpend { get; init; }
    public decimal? InvestmentsSpend { get; init; }
    public decimal? OtherSpend { get; init; }
    public bool IsYearEnd { get; init; }
}
