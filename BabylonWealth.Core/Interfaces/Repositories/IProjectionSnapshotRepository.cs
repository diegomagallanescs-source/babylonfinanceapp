using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface IProjectionSnapshotRepository : IBaseRepository<ProjectionSnapshot, Guid>
{
    /// <summary>All snapshots for one projection, oldest first — chart order.</summary>
    Task<IEnumerable<ProjectionSnapshot>> GetByProjectionAsync(Guid userId, Guid projectionId);

    /// <summary>
    /// The existing point for one projection/date/line, if any. Saving the same date and kind
    /// twice updates that point rather than stacking an unreachable duplicate behind it.
    /// </summary>
    Task<ProjectionSnapshot?> GetByDateAndKindAsync(
        Guid userId, Guid projectionId, DateTime snapshotDate, ProjectionSnapshotKind kind);

    /// <summary>All snapshots across every projection the user owns — used to build list summaries.</summary>
    Task<IEnumerable<ProjectionSnapshot>> GetAllForUserAsync(Guid userId);

    /// <summary>Soft-deletes every snapshot belonging to a projection. Called when the projection itself is deleted.</summary>
    Task SoftDeleteByProjectionAsync(Guid userId, Guid projectionId);
}
