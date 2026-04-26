namespace BabylonWealth.Core.DTOs.Responses;

public record InvestmentSummaryDto
{
    public decimal TotalValue { get; init; }
    public int InvestmentCount { get; init; }
}
