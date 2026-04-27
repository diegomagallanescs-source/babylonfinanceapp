namespace BabylonWealth.Core.DTOs.Responses;

public record StatementSummaryResponseDto
{
    public Guid Id { get; init; }
    public int Month { get; init; }
    public int Year { get; init; }
    public decimal TotalSpend { get; init; }
    public int TransactionCount { get; init; }
    public string AccountsIncluded { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public DateTime CreatedAt { get; init; }
}
