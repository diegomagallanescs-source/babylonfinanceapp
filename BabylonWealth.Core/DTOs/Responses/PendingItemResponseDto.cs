using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Responses;

public record PendingItemResponseDto
{
    public Guid Id { get; init; }
    public string Description { get; init; } = string.Empty;
    public string? Counterparty { get; init; }

    /// <summary>Positive = owed to user (asset). Negative = user owes (liability).</summary>
    public decimal Amount { get; init; }

    public DateTime? DueDate { get; init; }
    public PendingItemStatus Status { get; init; }
    public DateTime? SettledAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
