namespace BabylonWealth.Core.Entities;

public class NetWorthSnapshot : BaseEntity<Guid>
{
    public Guid UserId { get; private set; }
    public DateTime SnapshotDate { get; private set; }
    public decimal LiquidNetWorth { get; private set; }
    public decimal TotalNetWorth { get; private set; }
    public decimal TotalAssets { get; private set; }
    public decimal TotalLiabilities { get; private set; }
    public decimal TotalCreditUsed { get; private set; }
    public decimal TotalCreditLimit { get; private set; }
    public decimal TotalPending { get; private set; }
    public string? Annotation { get; private set; }

    private NetWorthSnapshot() { }

    public static NetWorthSnapshot Create(Guid userId, decimal liquidNetWorth, decimal totalNetWorth, decimal totalAssets, decimal totalLiabilities, decimal totalCreditUsed, decimal totalCreditLimit, decimal totalPending)
    {
        return new NetWorthSnapshot
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SnapshotDate = DateTime.UtcNow,
            LiquidNetWorth = liquidNetWorth,
            TotalNetWorth = totalNetWorth,
            TotalAssets = totalAssets,
            TotalLiabilities = totalLiabilities,
            TotalCreditUsed = totalCreditUsed,
            TotalCreditLimit = totalCreditLimit,
            TotalPending = totalPending
        };
    }

    public void AddAnnotation(string annotation)
    {
        Annotation = annotation;
        Touch();
    }
}