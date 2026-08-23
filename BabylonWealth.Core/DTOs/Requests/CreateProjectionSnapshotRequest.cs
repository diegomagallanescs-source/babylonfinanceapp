using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Requests;

public class CreateProjectionSnapshotRequest
{
    public DateTime SnapshotDate { get; set; }
    public ProjectionSnapshotKind Kind { get; set; }

    /// <summary>Optional free-text note saved with this snapshot. May be empty.</summary>
    public string? Notes { get; set; }

    /// <summary>The ledger to freeze at this date. Defaults to the projection's current workspace when omitted.</summary>
    public ProjectionStateDto? State { get; set; }
}
