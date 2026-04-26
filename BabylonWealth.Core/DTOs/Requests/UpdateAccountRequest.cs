using System.ComponentModel.DataAnnotations;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Requests;

public class UpdateAccountRequest
{
    [MaxLength(100)]
    public string? CustomLabel { get; set; }

    [Range(-1_000_000_000, 1_000_000_000)]
    public decimal? Balance { get; set; }

    public AccountType? AccountType { get; set; }

    public Guid? BudgetCategoryId { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}
