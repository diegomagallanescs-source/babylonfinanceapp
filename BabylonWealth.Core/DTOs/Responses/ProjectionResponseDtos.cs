using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Responses;

/// <summary>Summary row for the projections list — no ledger payload, keeps the list response small.</summary>
public class ProjectionSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SnapshotCount { get; set; }
    public int ProjectedCount { get; set; }
    public int RealizedCount { get; set; }
    public DateTime? LatestSnapshotDate { get; set; }
    public decimal? LatestTotalNetWorth { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>One dot on the projection chart, plus the ledger behind it.</summary>
public class ProjectionSnapshotResponseDto
{
    public Guid Id { get; set; }
    public Guid ProjectionId { get; set; }
    public DateTime SnapshotDate { get; set; }
    public ProjectionSnapshotKind Kind { get; set; }
    public string? Notes { get; set; }
    public decimal LiquidNetWorth { get; set; }
    public decimal TotalNetWorth { get; set; }
    public decimal TotalAssets { get; set; }
    public decimal TotalLiabilities { get; set; }
    public ProjectionStateDto State { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

/// <summary>Everything the projection detail view needs in one request.</summary>
public class ProjectionDetailResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProjectionStateDto Workspace { get; set; } = new();
    public List<ProjectionSnapshotResponseDto> Snapshots { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
