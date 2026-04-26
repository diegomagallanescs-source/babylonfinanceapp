using System.ComponentModel.DataAnnotations;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Requests;

public class CreateIncomeRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public IncomeType Type { get; set; }

    [Required]
    [Range(0, 100_000_000)]
    public decimal AnnualAmount { get; set; }
}
