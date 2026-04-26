using System.ComponentModel.DataAnnotations;

namespace BabylonWealth.Core.DTOs.Requests;

public class CreatePendingItemRequest
{
    [Required]
    [MaxLength(200)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Counterparty { get; set; }

    /// <summary>Positive = owed to user. Negative = user owes.</summary>
    [Required]
    [Range(-1_000_000_000, 1_000_000_000)]
    public decimal Amount { get; set; }

    public DateTime? DueDate { get; set; }
}
