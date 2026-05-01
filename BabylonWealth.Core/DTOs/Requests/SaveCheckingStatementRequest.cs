namespace BabylonWealth.Core.DTOs.Requests;

public record SaveCheckingStatementRequest
{
    public int Month { get; init; }
    public int Year { get; init; }
    public decimal TotalMoneyIn { get; init; }
    public decimal TotalMoneyOut { get; init; }
    public int TransactionCount { get; init; }
    public string AccountsIncluded { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public List<IncomeCategoryItemDto>? IncomeCategories { get; init; }
    public bool IsYearEnd { get; init; }
}

public record IncomeCategoryItemDto
{
    public string Name { get; init; } = string.Empty;
    public decimal Amount { get; init; }
}
