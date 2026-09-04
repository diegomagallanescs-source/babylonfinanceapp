namespace BabylonWealth.Core.DTOs.Responses;

public record SpendingCategoryResponseDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
    public int DisplayOrder { get; init; }
    public DateTime CreatedAt { get; init; }
}
