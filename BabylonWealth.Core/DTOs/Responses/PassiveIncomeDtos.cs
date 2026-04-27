using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Responses;

/// <summary>Returned by GET /api/v1/investmentincome/summary</summary>
public record PassiveIncomeSummaryDto
{
    /// <summary>Total passive income received this calendar month.</summary>
    public decimal CurrentMonthTotal { get; init; }

    /// <summary>Total passive income received this calendar year.</summary>
    public decimal CurrentYearTotal { get; init; }

    /// <summary>
    /// The ratio that matters: passive income / monthly living expenses.
    /// When this hits 1.0, the river covers all expenses — Arkad's goal.
    /// Null if no spending data exists to compute monthly expenses from.
    /// </summary>
    public decimal? PassiveToExpensesRatio { get; init; }

    /// <summary>Monthly totals for the last 12 months — feeds the trend bar chart.</summary>
    public IEnumerable<MonthlyPassiveIncomeDto> TwelveMonthTrend { get; init; } = [];
}

public record MonthlyPassiveIncomeDto
{
    public int Year { get; init; }
    public int Month { get; init; }
    public decimal Total { get; init; }

    /// <summary>e.g. "Apr 2026" — formatted label for chart axis.</summary>
    public string Label => new DateTime(Year, Month, 1).ToString("MMM yyyy");
}

/// <summary>Returned by GET /api/v1/investmentincome and POST /api/v1/investmentincome</summary>
public record InvestmentIncomeResponseDto
{
    public Guid Id { get; init; }
    public string SourceName { get; init; } = string.Empty;
    public InvestmentIncomeType Type { get; init; }
    public string TypeLabel { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public DateTime ReceivedDate { get; init; }
    public string? Notes { get; init; }
    public DateTime CreatedAt { get; init; }
}
