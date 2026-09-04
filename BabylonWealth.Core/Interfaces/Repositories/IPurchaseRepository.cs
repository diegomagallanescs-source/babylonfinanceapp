using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface IPurchaseRepository : IBaseRepository<Purchase, Guid>
{
    /// <summary>All purchases for a specific month — the primary query for the Spending tab.</summary>
    Task<IEnumerable<Purchase>> GetByMonthAsync(Guid userId, int month, int year);

    /// <summary>Soft-deletes every purchase in the given month.</summary>
    Task DeleteByMonthAsync(Guid userId, int month, int year);

    /// <summary>Monthly spend grouped by category between two dates — feeds the Spending tab's stacked bar chart.</summary>
    Task<IEnumerable<(int Year, int Month, Guid CategoryId, string CategoryName, string CategoryColor, decimal Total)>>
        GetMonthlyTrendByCategoryAsync(Guid userId, DateTime from, DateTime to);
}
