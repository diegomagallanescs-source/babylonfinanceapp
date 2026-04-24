using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface IIncomeRepository : IBaseRepository<IncomeSource, Guid>
{
    /// <summary>
    /// Returns only IsActive = true sources.
    /// When a user changes jobs, the old source is deactivated — not deleted.
    /// </summary>
    Task<IEnumerable<IncomeSource>> GetActiveOnlyAsync(Guid userId);

    /// <summary>
    /// Sum of AnnualAmount across all active sources.
    /// Used to compute Arkad's 10% savings target (total * 0.10).
    /// </summary>
    Task<decimal> GetAnnualTotalAsync(Guid userId);
}
