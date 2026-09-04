using System.ComponentModel.DataAnnotations;

namespace BabylonWealth.Core.DTOs.Requests;

public record CreatePurchaseRequest
{
    [Required]
    public Guid SpendingCategoryId { get; init; }

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than zero.")]
    public decimal Amount { get; init; }

    [MaxLength(500)]
    public string? Description { get; init; }

    [Required]
    public DateTime PurchaseDate { get; init; }
}
