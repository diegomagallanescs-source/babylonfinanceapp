namespace BabylonWealth.Core.DTOs.Requests;

public record UpdateSnapshotRequest
{
    public decimal LiquidNetWorth { get; init; }
    public decimal TotalNetWorth { get; init; }
    public DateTime SnapshotDate { get; init; }
}
