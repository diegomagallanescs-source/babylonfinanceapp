using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Responses;

/// <summary>Returned by POST /api/v1/properties/analyze — full deal metrics.</summary>
public record PropertyAnalysisResponseDto
{
    // ── Loan summary ──────────────────────────────────────────────
    public decimal LoanAmount { get; init; }
    public decimal MonthlyPrincipalAndInterest { get; init; }
    public decimal EstimatedTotalInterest { get; init; }
    public decimal CashToClose { get; init; }

    // ── Operating metrics ─────────────────────────────────────────
    public decimal GrossMonthlyRent { get; init; }
    public decimal EffectiveMonthlyRent { get; init; }   // after vacancy
    public decimal TotalMonthlyExpenses { get; init; }   // PITI + HOA + reserves

    // ── Returns ───────────────────────────────────────────────────
    public decimal MonthlyCashFlow { get; init; }
    public decimal AnnualCashFlow { get; init; }

    /// <summary>Net Operating Income / Purchase Price * 100.</summary>
    public decimal CapRatePercent { get; init; }

    /// <summary>Annual cash flow / total cash invested * 100.</summary>
    public decimal CashOnCashReturnPercent { get; init; }

    /// <summary>Gross Rent Multiplier: Purchase Price / Annual Gross Rent.</summary>
    public decimal GrossRentMultiplier { get; init; }

    /// <summary>Monthly rent needed to break even (cash flow = 0).</summary>
    public decimal BreakEvenRent { get; init; }

    /// <summary>Debt Service Coverage Ratio: NOI / Annual Debt Service. DSCR loans require >= 1.25.</summary>
    public decimal DebtServiceCoverageRatio { get; init; }

    // ── Deal signal ───────────────────────────────────────────────
    public DealSignal DealSignal { get; init; }
    public string DealSignalExplanation { get; init; } = string.Empty;

    // ── Amortization preview ──────────────────────────────────────
    public IEnumerable<AmortizationRowDto> FirstTwelveMonths { get; init; } = [];
}

public record AmortizationRowDto
{
    public int Month { get; init; }
    public decimal Payment { get; init; }
    public decimal Principal { get; init; }
    public decimal Interest { get; init; }
    public decimal RemainingBalance { get; init; }
}