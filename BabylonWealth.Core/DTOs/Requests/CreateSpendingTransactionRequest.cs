using System.ComponentModel.DataAnnotations;

namespace BabylonWealth.Core.DTOs.Requests;

public record CreateSpendingTransactionRequest
{
    [Required]
    public Guid CategoryId { get; init; }

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than zero.")]
    public decimal Amount { get; init; }

    [Required]
    [MaxLength(500)]
    public string Description { get; init; } = string.Empty;

    [Required]
    public DateTime TransactionDate { get; init; }

    public Guid? AccountId { get; init; }
}
