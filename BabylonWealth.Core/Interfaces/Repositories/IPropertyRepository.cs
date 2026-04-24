using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface IPropertyRepository : IBaseRepository<Property, Guid>
{
    /// <summary>
    /// Total equity across all saved properties: sum of (CurrentEstimatedValue - LoanBalance).
    /// Added to LiquidNetWorth to produce TotalNetWorth.
    /// </summary>
    Task<decimal> GetTotalEquityAsync(Guid userId);

    /// <summary>
    /// Properties whose CurrentEstimatedValue hasn't been updated in 90+ days.
    /// Used to drive the staleness warning badge in the UI.
    /// </summary>
    Task<IEnumerable<Property>> GetStaleValuationsAsync(Guid userId, int staleDays = 90);
}
