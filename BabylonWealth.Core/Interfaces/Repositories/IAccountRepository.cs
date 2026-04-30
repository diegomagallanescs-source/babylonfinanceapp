using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface IAccountRepository : IBaseRepository<BankAccount, Guid>
{
    /// <summary>All accounts linked to a specific budget category (e.g. all "Necessities" checking accounts).</summary>
    Task<IEnumerable<BankAccount>> GetByBudgetCategoryAsync(Guid userId, Guid categoryId);

    /// <summary>Sum of all active account balances — used by NetWorthService to compute liquid assets.</summary>
    Task<decimal> GetTotalBalanceAsync(Guid userId);

    /// <summary>Persists a new display order for a user's accounts. Each tuple is (accountId, zeroBasedIndex).</summary>
    Task ReorderAsync(Guid userId, IEnumerable<(Guid id, int order)> updates);
}
