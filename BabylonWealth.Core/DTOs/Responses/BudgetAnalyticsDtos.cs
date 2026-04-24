namespace BabylonWealth.Core.DTOs.Responses;

/// <summary>Returned by GET /api/v1/spending/analytics?month=&year=</summary>
public record BudgetAnalyticsResponseDto
{
    public int Month { get; init; }
    public int Year { get; init; }

    /// <summary>Total annual income / 12 — the baseline for percentage calculations.</summary>
    public decimal MonthlyIncome { get; init; }

    public decimal TotalSpent { get; init; }

    /// <summary>MonthlyIncome - TotalSpent. Positive = saving, negative = overspending.</summary>
    public decimal NetSavings { get; init; }

    /// <summary>Per-category breakdown — one entry per budget category.</summary>
    public IEnumerable<CategoryBreakdownDto> CategoryBreakdowns { get; init; } = [];

    /// <summary>Amount that went to any category tagged as "Investing" type.</summary>
    public decimal TotalInvested { get; init; }

    /// <summary>Arkad's target: MonthlyIncome * 0.10</summary>
    public decimal ArkadSavingsTarget { get; init; }
}

public record CategoryBreakdownDto
{
    public Guid CategoryId { get; init; }
    public string CategoryName { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;

    /// <summary>User's target — e.g. 0.50 for Necessities.</summary>
    public decimal TargetPercentage { get; init; }

    /// <summary>What was actually spent this month.</summary>
    public decimal ActualAmount { get; init; }

    /// <summary>ActualAmount / MonthlyIncome. For comparison against TargetPercentage.</summary>
    public decimal ActualPercentage { get; init; }

    /// <summary>Positive = under budget. Negative = over budget.</summary>
    public decimal Variance { get; init; }

    public bool IsOverBudget => Variance < 0;
}
