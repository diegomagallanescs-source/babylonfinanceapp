namespace BabylonWealth.Core.Entities;

public class NetWorthAnnotation : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public DateTime AnnotationDate { get; private set; }
    public string Text { get; private set; } = string.Empty;
    public string? Category { get; private set; }
    public Guid? SnapshotId { get; set; }
    public NetWorthSnapshot? Snapshot { get; set; }

    private NetWorthAnnotation() { }

    public static NetWorthAnnotation Create(Guid userId, DateTime annotationDate, string text, string? category = null, Guid? snapshotId = null)
    {
        return new NetWorthAnnotation
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AnnotationDate = annotationDate,
            Text = text,
            Category = category,
            SnapshotId = snapshotId
        };
    }

    public void UpdateText(string text)
    {
        Text = text;
        Touch();
    }
}