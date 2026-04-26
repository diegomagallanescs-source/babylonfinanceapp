using System.ComponentModel.DataAnnotations;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Requests;

public class CreateLoanRequest
{
    [Required]
    [MaxLength(100)]
    public string CustomLabel { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? LenderName { get; set; }

    [Required]
    [Range(0, 1_000_000_000)]
    public decimal Balance { get; set; }

    [Required]
    [Range(0, 1)]
    public decimal InterestRate { get; set; }

    [Required]
    public LoanType LoanType { get; set; }
}
