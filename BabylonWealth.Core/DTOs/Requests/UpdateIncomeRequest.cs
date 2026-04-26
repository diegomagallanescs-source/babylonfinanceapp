using System.ComponentModel.DataAnnotations;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Requests;

public class UpdateIncomeRequest
{
    [MaxLength(200)]
    public string? Name { get; set; }

    public IncomeType? Type { get; set; }

    [Range(0, 100_000_000)]
    public decimal? AnnualAmount { get; set; }
}
