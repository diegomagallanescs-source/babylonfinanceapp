using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Entities;

/// <summary>
/// A dated point on a projection's chart. Stores the full ledger as it stood when saved
/// (StateJson) so the user can reload that exact accounting later, plus the net worth
/// figures derived from it so the chart renders without deserializing every snapshot.
/// </summary>
public class ProjectionSnapshot : BaseEntity<Guid>
{
    public Guid UserId { get; set; }
    public Guid ProjectionId { get; private set; }
    public DateTime SnapshotDate { get; private set; }
    public ProjectionSnapshotKind Kind { get; private set; }
    public string? Notes { get; private set; }
    public decimal LiquidNetWorth { get; private set; }
    public decimal TotalNetWorth { get; private set; }
    public decimal TotalAssets { get; private set; }
    public decimal TotalLiabilities { get; private set; }

    /// <summary>Serialized ProjectionStateDto — the ledger frozen at this point in time.</summary>
    public string StateJson { get; private set; } = "{}";

    private ProjectionSnapshot() { }

    public static ProjectionSnapshot Create(
        Guid userId,
        Guid projectionId,
        DateTime snapshotDate,
        ProjectionSnapshotKind kind,
        string? notes,
        decimal liquidNetWorth,
        decimal totalNetWorth,
        decimal totalAssets,
        decimal totalLiabilities,
        string stateJson)
    {
        return new ProjectionSnapshot
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ProjectionId = projectionId,
            SnapshotDate = snapshotDate,
            Kind = kind,
            Notes = notes,
            LiquidNetWorth = liquidNetWorth,
            TotalNetWorth = totalNetWorth,
            TotalAssets = totalAssets,
            TotalLiabilities = totalLiabilities,
            StateJson = stateJson
        };
    }

    public void Update(
        DateTime snapshotDate,
        ProjectionSnapshotKind kind,
        string? notes,
        decimal liquidNetWorth,
        decimal totalNetWorth,
        decimal totalAssets,
        decimal totalLiabilities,
        string stateJson)
    {
        SnapshotDate = snapshotDate;
        Kind = kind;
        Notes = notes;
        LiquidNetWorth = liquidNetWorth;
        TotalNetWorth = totalNetWorth;
        TotalAssets = totalAssets;
        TotalLiabilities = totalLiabilities;
        StateJson = stateJson;
        Touch();
    }
}
