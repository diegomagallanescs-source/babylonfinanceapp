using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class CreditCardRepository : BaseRepository<CreditCard, Guid>, ICreditCardRepository
{
    public CreditCardRepository(BabylonDbContext context) : base(context) { }

    public async Task<IEnumerable<CreditCard>> GetByCardTypeAsync(Guid userId, CardType type)
    {
        return await _dbSet
            .Where(c => c.UserId == userId && c.CardType == type)
            .ToListAsync();
    }

    public async Task<decimal> GetTotalBalanceAsync(Guid userId)
    {
        return await _dbSet
            .Where(c => c.UserId == userId)
            .SumAsync(c => c.Balance);
    }

    public async Task<decimal> GetTotalCreditLimitAsync(Guid userId)
    {
        return await _dbSet
            .Where(c => c.UserId == userId)
            .SumAsync(c => c.CreditLimit);
    }
}
