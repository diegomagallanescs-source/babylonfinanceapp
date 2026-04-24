using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.Interfaces.Repositories;

public interface IInvestmentRepository : IBaseRepository<Investment, Guid>
{
    /// <summary>Filter by investment type (Brokerage, Roth IRA, Crypto, etc.).</summary>
    Task<IEnumerable<Investment>> GetByInvestmentTypeAsync(Guid userId, InvestmentType type);

    /// <summary>Sum of all active investment values — the "invested wealth" component of liquid net worth.</summary>
    Task<decimal> GetTotalValueAsync(Guid userId);
}
