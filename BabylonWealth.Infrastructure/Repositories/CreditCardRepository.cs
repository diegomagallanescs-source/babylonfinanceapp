using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class CreditCardRepository : BaseRepository<CreditCard, Guid>, ICreditCardRepository
{
    public CreditCardRepository(BabylonDbContext context) : base(context) { }

    public override async Task<CreditCard?> GetByIdAsync(Guid id, Guid userId)
    {
        return await _dbSet
            .Include(c => c.Bank)
            .Where(c => c.UserId == userId)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public override async Task<IEnumerable<CreditCard>> GetAllByUserAsync(Guid userId)
    {
        return await _dbSet
            .Include(c => c.Bank)
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.CustomLabel)
            .ToListAsync();
    }

    public async Task<IEnumerable<CreditCard>> GetByCardTypeAsync(Guid userId, CardType type)
    {
        return await _dbSet
            .Include(c => c.Bank)
            .Where(c => c.UserId == userId && c.CardType == type)
            .OrderBy(c => c.CustomLabel)
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
