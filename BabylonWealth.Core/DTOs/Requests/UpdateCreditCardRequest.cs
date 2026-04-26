using System.ComponentModel.DataAnnotations;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Requests;

public class UpdateCreditCardRequest
{
    [MaxLength(100)]
    public string? CustomLabel { get; set; }

    [Range(0, 1_000_000_000)]
    public decimal? Balance { get; set; }

    [Range(0, 1_000_000_000)]
    public decimal? CreditLimit { get; set; }

    [Range(0, 100)]
    public decimal? APR { get; set; }

    public CardType? CardType { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}
