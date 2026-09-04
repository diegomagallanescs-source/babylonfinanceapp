namespace BabylonWealth.Core.DTOs.Responses;

public record PurchaseResponseDto
{
    public Guid Id { get; init; }
    public Guid CategoryId { get; init; }
    public string CategoryName { get; init; } = string.Empty;
    public string CategoryColor { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public string Description { get; init; } = string.Empty;
    public DateTime PurchaseDate { get; init; }
    public DateTime CreatedAt { get; init; }
}

/// <summary>One category's total within a PurchaseTrendPointDto month.</summary>
public record PurchaseCategoryAmountDto
{
    public Guid CategoryId { get; init; }
    public string CategoryName { get; init; } = string.Empty;
    public string CategoryColor { get; init; } = string.Empty;
    public decimal Amount { get; init; }
}

/// <summary>One month's spend broken down by category — feeds the Spending tab's stacked bar chart.</summary>
public record PurchaseTrendPointDto
{
    public int Year { get; init; }
    public int Month { get; init; }
    public string Label => new DateTime(Year, Month, 1).ToString("MMM yyyy");
    public IReadOnlyList<PurchaseCategoryAmountDto> Categories { get; init; } = [];
}
