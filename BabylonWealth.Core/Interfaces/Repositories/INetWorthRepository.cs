using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface INetWorthRepository : IBaseRepository<NetWorthSnapshot, Guid>
{
    /// <summary>The most recent snapshot — used by SnapshotService to check if a new one is needed.</summary>
    Task<NetWorthSnapshot?> GetLatestSnapshotAsync(Guid userId);

    /// <summary>
    /// All snapshots within a date range, ordered ascending by SnapshotDate.
    /// This is the dataset that feeds the Recharts AreaChart on the River tab.
    /// </summary>
    Task<IEnumerable<NetWorthSnapshot>> GetHistoryAsync(Guid userId, DateTime from, DateTime to);

    /// <summary>
    /// The date of the most recent snapshot.
    /// SnapshotBackgroundService uses this to enforce the 14-day minimum gap.
    /// </summary>
    Task<DateTime?> GetLastSnapshotDateAsync(Guid userId);

    /// <summary>Saves or updates the annotation text on an existing snapshot.</summary>
    Task AnnotateAsync(Guid snapshotId, Guid userId, string annotationText);
}
