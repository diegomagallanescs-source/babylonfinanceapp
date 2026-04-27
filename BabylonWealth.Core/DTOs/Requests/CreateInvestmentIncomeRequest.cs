using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Requests;

public record CreateInvestmentIncomeRequest
{
    public string SourceName { get; init; } = string.Empty;
    public InvestmentIncomeType Type { get; init; }
    public decimal Amount { get; init; }
    public DateTime ReceivedDate { get; init; }
    public string? Notes { get; init; }
}
