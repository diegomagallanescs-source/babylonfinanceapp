using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface IInvestmentIncomeRepository : IBaseRepository<InvestmentIncome, Guid>
{
    /// <summary>All passive income records for a specific month. Used for the monthly ratio panel.</summary>
    Task<IEnumerable<InvestmentIncome>> GetByMonthAsync(Guid userId, int month, int year);

    /// <summary>
    /// Returns the total passive income received per month for the last N months.
    /// Drives the 12-month trend bar chart and the PassiveIncome vs Expenses ratio.
    /// </summary>
    Task<IEnumerable<(int Year, int Month, decimal Total)>> GetMonthlyTotalsAsync(Guid userId, int months = 12);

    /// <summary>Sum of all passive income in the current calendar year.</summary>
    Task<decimal> GetAnnualTotalAsync(Guid userId, int year);
}
