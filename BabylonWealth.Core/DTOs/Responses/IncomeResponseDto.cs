using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Responses;

public record IncomeResponseDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public IncomeType Type { get; init; }
    public decimal AnnualAmount { get; init; }
    public decimal MonthlyAmount { get; init; }
    public decimal ArkadSavingsTarget { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
