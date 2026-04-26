using System.ComponentModel.DataAnnotations;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Requests;

public class CreateInvestmentRequest
{
    [Required]
    public Guid BankId { get; set; }

    [Required]
    [MaxLength(100)]
    public string CustomLabel { get; set; } = string.Empty;

    [Required]
    [Range(0, 1_000_000_000)]
    public decimal CurrentValue { get; set; }

    [Required]
    public InvestmentType InvestmentType { get; set; }

    [MaxLength(20)]
    public string? Ticker { get; set; }
}
