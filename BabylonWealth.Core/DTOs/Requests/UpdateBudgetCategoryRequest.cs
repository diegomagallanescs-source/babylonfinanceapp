using System.ComponentModel.DataAnnotations;

namespace BabylonWealth.Core.DTOs.Requests;

public record UpdateBudgetCategoryRequest
{
    [MaxLength(100)]
    public string? Name { get; init; }

    [Range(0.01, 1.0)]
    public decimal? TargetPercentage { get; init; }

    [MaxLength(7)]
    public string? Color { get; init; }
}
