using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Responses;

public record CreditCardResponseDto
{
    public Guid Id { get; init; }
    public Guid? BankId { get; init; }
    public string BankName { get; init; } = string.Empty;
    public string? BankLogoUrl { get; init; }
    public string CustomLabel { get; init; } = string.Empty;
    public decimal Balance { get; init; }
    public decimal CreditLimit { get; init; }
    public decimal APR { get; init; }
    public CardType CardType { get; init; }
    public decimal UtilizationRate { get; init; }
    public string? Notes { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
