using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface ILoanRepository : IBaseRepository<Loan, Guid>
{
    /// <summary>Filter loans by type (Student, Auto, HELOC, etc.) for categorized Ledger display.</summary>
    Task<IEnumerable<Loan>> GetByLoanTypeAsync(Guid userId, LoanType type);

    /// <summary>
    /// Sum of all active loan balances.
    /// Stored as positive numbers internally; NetWorthService negates this when computing liabilities.
    /// </summary>
    Task<decimal> GetTotalOutstandingBalanceAsync(Guid userId);
}
