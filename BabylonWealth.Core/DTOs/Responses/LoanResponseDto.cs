using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Responses;

public record LoanResponseDto
{
    public Guid Id { get; init; }
    public string CustomLabel { get; init; } = string.Empty;
    public string? LenderName { get; init; }

    /// <summary>Displayed as a negative number — balance is stored positive internally.</summary>
    public decimal Balance { get; init; }

    public decimal InterestRate { get; init; }
    public LoanType LoanType { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
