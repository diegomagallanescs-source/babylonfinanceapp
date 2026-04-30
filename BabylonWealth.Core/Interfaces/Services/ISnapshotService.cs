using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Services;

/// <summary>
/// Captures point-in-time net worth snapshots.
/// Called automatically by SnapshotBackgroundService daily,
/// and available via POST /api/v1/networth/snapshot for manual triggers.
///
/// The service is idempotent: calling it multiple times on the same day
/// will not create duplicate snapshots.
/// </summary>
public interface ISnapshotService
{
    /// <summary>
    /// Computes the current net worth and writes a NetWorthSnapshot record.
    /// Idempotent — skips if a snapshot was already taken today (same UTC date).
    /// </summary>
    Task<NetWorthSnapshot> TakeSnapshotAsync(Guid userId);

    /// <summary>
    /// Returns true if no snapshot has been taken today (UTC date).
    /// Called by SnapshotBackgroundService on every 6-hour tick.
    /// </summary>
    Task<bool> ShouldTakeSnapshotAsync(Guid userId);

    /// <summary>
    /// Adds or updates an annotation on an existing snapshot.
    /// If annotationDate doesn't match a snapshot exactly, attaches to the nearest prior snapshot.
    /// Called by POST /api/v1/networth/annotate
    /// </summary>
    Task AnnotateSnapshotAsync(Guid userId, DateTime annotationDate, string text);

    /// <summary>Clears the annotation from the snapshot nearest to the given date.</summary>
    Task ClearAnnotationAsync(Guid userId, DateTime annotationDate);

    /// <summary>
    /// Returns snapshot history within a date range, mapped to chart-ready DTOs.
    /// Called by GET /api/v1/networth/history
    /// </summary>
    Task<IEnumerable<NetWorthHistoryPointDto>> GetHistoryAsync(Guid userId, DateTime from, DateTime to);

    /// <summary>Soft-deletes the snapshot with the given ID if it belongs to the user.</summary>
    Task DeleteSnapshotAsync(Guid userId, Guid snapshotId);

    /// <summary>Updates the liquid NW, total NW, and date of an existing snapshot.</summary>
    Task UpdateSnapshotAsync(Guid userId, Guid snapshotId, decimal liquidNetWorth, decimal totalNetWorth, DateTime snapshotDate);
}
