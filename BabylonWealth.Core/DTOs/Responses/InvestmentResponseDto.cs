using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Responses;

public record InvestmentResponseDto
{
    public Guid Id { get; init; }
    public Guid? BankId { get; init; }
    public string? BankName { get; init; }
    public string CustomLabel { get; init; } = string.Empty;
    public decimal CurrentValue { get; init; }
    public string? Ticker { get; init; }
    public InvestmentType InvestmentType { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
