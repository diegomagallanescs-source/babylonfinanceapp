using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface ICreditCardRepository : IBaseRepository<CreditCard, Guid>
{
    /// <summary>Filter by Personal or Business card type — drives the Ledger tab's section split.</summary>
    Task<IEnumerable<CreditCard>> GetByCardTypeAsync(Guid userId, CardType type);

    /// <summary>Sum of all active card balances — counted as liabilities in net worth computation.</summary>
    Task<decimal> GetTotalBalanceAsync(Guid userId);

    /// <summary>Sum of all credit limits — used to compute overall utilization rate.</summary>
    Task<decimal> GetTotalCreditLimitAsync(Guid userId);
}
