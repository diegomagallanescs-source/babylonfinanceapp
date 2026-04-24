using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

/// <summary>
/// Computes net worth live from the current state of all entities.
/// Net worth is NEVER stored — only snapshots (point-in-time records) are persisted.
/// This service aggregates across accounts, cards, loans, investments, pending items, and properties.
/// </summary>
public interface INetWorthService
{
    /// <summary>
    /// Computes both LiquidNetWorth and TotalNetWorth in a single pass.
    /// Called by GET /api/v1/networth/current and by SnapshotService before writing a snapshot.
    /// </summary>
    Task<NetWorthResponseDto> ComputeAsync(Guid userId);

    /// <summary>
    /// Returns only the liquid net worth figure.
    /// Used internally when total net worth is not needed (e.g. tier calculation on the River tab).
    /// </summary>
    Task<decimal> ComputeLiquidAsync(Guid userId);
}
