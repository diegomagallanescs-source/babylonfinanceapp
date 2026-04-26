using System.ComponentModel.DataAnnotations;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Requests;

public class UpdateLoanRequest
{
    [MaxLength(100)]
    public string? CustomLabel { get; set; }

    [MaxLength(200)]
    public string? LenderName { get; set; }

    [Range(0, 1_000_000_000)]
    public decimal? Balance { get; set; }

    [Range(0, 1)]
    public decimal? InterestRate { get; set; }

    public LoanType? LoanType { get; set; }
}
