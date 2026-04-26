using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Requests;

public record CreateAnnotationRequest
{
    public DateTime AnnotationDate { get; init; }
    public string Text { get; init; } = string.Empty;
    public AnnotationCategory? Category { get; init; }
    public Guid? SnapshotId { get; init; }
}
