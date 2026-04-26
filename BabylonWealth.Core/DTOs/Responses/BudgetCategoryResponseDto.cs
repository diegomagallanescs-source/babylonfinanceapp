namespace BabylonWealth.Core.DTOs.Responses;

public record BudgetCategoryResponseDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public decimal TargetPercentage { get; init; }
    public string Color { get; init; } = string.Empty;
    public int DisplayOrder { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
