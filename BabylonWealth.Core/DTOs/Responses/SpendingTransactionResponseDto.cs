namespace BabylonWealth.Core.DTOs.Responses;

/// <summary>One month's total spending — returned by GET /spending/trend.</summary>
public record SpendingTrendPointDto
{
    public int Year { get; init; }
    public int Month { get; init; }
    public decimal Total { get; init; }
    public string Label => new DateTime(Year, Month, 1).ToString("MMM yyyy");
}

public record SpendingTransactionResponseDto
{
    public Guid Id { get; init; }
    public Guid CategoryId { get; init; }
    public string CategoryName { get; init; } = string.Empty;
    public string CategoryColor { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public string Description { get; init; } = string.Empty;
    public DateTime TransactionDate { get; init; }
    public Guid? AccountId { get; init; }
    public string? AccountLabel { get; init; }
    public DateTime CreatedAt { get; init; }
}
