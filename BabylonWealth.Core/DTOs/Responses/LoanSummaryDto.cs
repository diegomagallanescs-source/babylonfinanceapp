namespace BabylonWealth.Core.DTOs.Responses;

public record LoanSummaryDto
{
    /// <summary>Sum of all outstanding loan balances (positive — the total you owe).</summary>
    public decimal TotalOutstanding { get; init; }

    public int LoanCount { get; init; }
}
