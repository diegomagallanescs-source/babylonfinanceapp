using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface IMonthlyBudgetSnapshotRepository : IBaseRepository<MonthlyBudgetSnapshot, Guid>
{
    /// <summary>Returns true if a budget snapshot already exists for this user/month/year pair.</summary>
    Task<bool> ExistsForMonthAsync(Guid userId, int month, int year);
}
