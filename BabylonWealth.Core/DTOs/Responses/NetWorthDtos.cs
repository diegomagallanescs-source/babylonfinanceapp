namespace BabylonWealth.Core.DTOs.Responses;

/// <summary>
/// Returned by GET /api/v1/networth/current.
/// Net worth is always computed live — this is never stored directly.
/// Only snapshots (NetWorthSnapshot entity) are persisted.
/// </summary>
public record NetWorthResponseDto
{
    /// <summary>Cash + investments − all debts. Does NOT include property equity.</summary>
    public decimal LiquidNetWorth { get; init; }

    /// <summary>LiquidNetWorth + sum of (PropertyEstimatedValue - PropertyLoanBalance).</summary>
    public decimal TotalNetWorth { get; init; }

    public decimal TotalAssets { get; init; }
    public decimal TotalLiabilities { get; init; }
    public decimal TotalCreditUsed { get; init; }
    public decimal TotalCreditLimit { get; init; }

    /// <summary>TotalCreditUsed / TotalCreditLimit * 100. Null if user has no credit cards.</summary>
    public decimal? CreditUtilizationPercent { get; init; }

    /// <summary>Net sum of all pending items (positive = owed to user, negative = user owes).</summary>
    public decimal PendingItemsNet { get; init; }

    /// <summary>Total equity across all saved properties. Zero if no properties.</summary>
    public decimal PropertyEquity { get; init; }

    public DateTime ComputedAt { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// A single point in the net worth history chart.
/// Returned as a list by GET /api/v1/networth/history.
/// </summary>
public record NetWorthHistoryPointDto
{
    public DateTime SnapshotDate { get; init; }
    public decimal LiquidNetWorth { get; init; }
    public decimal TotalNetWorth { get; init; }

    /// <summary>Annotation text for this snapshot. Null if no annotation. Renders as a flag on the chart.</summary>
    public string? Annotation { get; init; }
}
