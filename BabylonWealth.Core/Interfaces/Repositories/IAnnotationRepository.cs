using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface IAnnotationRepository : IBaseRepository<NetWorthAnnotation, Guid>
{
    /// <summary>
    /// All annotations within a date range — returned alongside snapshot history
    /// so the chart can render annotation flags at the correct x-axis positions.
    /// </summary>
    Task<IEnumerable<NetWorthAnnotation>> GetByDateRangeAsync(Guid userId, DateTime from, DateTime to);

    /// <summary>Annotation attached to a specific snapshot, if one exists.</summary>
    Task<NetWorthAnnotation?> GetBySnapshotIdAsync(Guid userId, Guid snapshotId);

    /// <summary>
    /// Upsert: if an annotation already exists on this date, update it.
    /// If not, create a new one. Prevents duplicate annotations on the same date.
    /// </summary>
    Task<NetWorthAnnotation> UpsertAsync(Guid userId, DateTime annotationDate, string text, string? category = null, Guid? snapshotId = null);
}
