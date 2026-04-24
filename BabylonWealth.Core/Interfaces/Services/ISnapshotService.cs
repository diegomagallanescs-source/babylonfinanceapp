using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Services;

/// <summary>
/// Captures point-in-time net worth snapshots.
/// Called automatically by SnapshotBackgroundService every two weeks on Sunday,
/// and available via POST /api/v1/networth/snapshot for manual triggers.
///
/// The service is idempotent: calling it multiple times on the same day
/// will not create duplicate snapshots.
/// </summary>
public interface ISnapshotService
{
    /// <summary>
    /// Computes the current net worth and writes a NetWorthSnapshot record.
    /// Safe to call on every startup — skips if a snapshot was already taken today.
    /// </summary>
    Task<NetWorthSnapshot> TakeSnapshotAsync(Guid userId);

    /// <summary>
    /// Determines whether a new snapshot should be taken right now.
    /// Returns true if: today is Sunday AND it has been 14+ days since the last snapshot.
    /// Called by SnapshotBackgroundService on every 6-hour tick.
    /// </summary>
    Task<bool> ShouldTakeSnapshotAsync(Guid userId);

    /// <summary>
    /// Adds or updates an annotation on an existing snapshot.
    /// If annotationDate doesn't match a snapshot exactly, attaches to the nearest prior snapshot.
    /// Called by POST /api/v1/networth/annotate
    /// </summary>
    Task AnnotateSnapshotAsync(Guid userId, DateTime annotationDate, string text);
}
