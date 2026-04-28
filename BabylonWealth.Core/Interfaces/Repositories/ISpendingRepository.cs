using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface ISpendingRepository : IBaseRepository<SpendingTransaction, Guid>
{
    /// <summary>All spending transactions for a specific month — the primary filter for the Spending tab.</summary>
    Task<IEnumerable<SpendingTransaction>> GetByMonthAsync(Guid userId, int month, int year);

    /// <summary>Filter transactions by budget category — used for the Single Category chart mode.</summary>
    Task<IEnumerable<SpendingTransaction>> GetByCategoryAsync(Guid userId, Guid categoryId);

    /// <summary>All transactions charged to a specific bank account.</summary>
    Task<IEnumerable<SpendingTransaction>> GetByAccountAsync(Guid userId, Guid accountId);

    /// <summary>
    /// Total spent per category for a given month.
    /// Returns category ID + total — the raw data for BudgetAnalyticsService to compare against targets.
    /// </summary>
    Task<IEnumerable<(Guid CategoryId, decimal Total)>> GetCategoryTotalsForMonthAsync(Guid userId, int month, int year);

    /// <summary>Monthly spending totals between two dates — feeds the home screen money-flow chart.</summary>
    Task<IEnumerable<(int Year, int Month, decimal Total)>> GetMonthlyTrendAsync(Guid userId, DateTime from, DateTime to);
}
