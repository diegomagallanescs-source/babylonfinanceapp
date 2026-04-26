using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Responses;

public record AnnotationResponseDto
{
    public Guid Id { get; init; }
    public DateTime AnnotationDate { get; init; }
    public string Text { get; init; } = string.Empty;
    public AnnotationCategory? Category { get; init; }

    /// <summary>Hex color derived from Category — used by the frontend to render chart flags.</summary>
    public string Color { get; init; } = string.Empty;

    public Guid? SnapshotId { get; init; }
    public DateTime CreatedAt { get; init; }

    public static string ColorForCategory(AnnotationCategory? category) => category switch
    {
        AnnotationCategory.Income     => "#4CAF7D",
        AnnotationCategory.Expense    => "#E05555",
        AnnotationCategory.Investment => "#C9A84C",
        AnnotationCategory.Milestone  => "#1B7A6E",
        AnnotationCategory.Note       => "#8A8070",
        _                             => "#8A8070"
    };
}
