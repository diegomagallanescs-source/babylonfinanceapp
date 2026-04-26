using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class AccountRepository : BaseRepository<BankAccount, Guid>, IAccountRepository
{
    public AccountRepository(BabylonDbContext context) : base(context) { }

    public override async Task<BankAccount?> GetByIdAsync(Guid id, Guid userId)
    {
        return await _dbSet
            .Include(a => a.Bank)
            .Where(a => a.UserId == userId)
            .FirstOrDefaultAsync(a => a.Id == id);
    }

    public override async Task<IEnumerable<BankAccount>> GetAllByUserAsync(Guid userId)
    {
        return await _dbSet
            .Include(a => a.Bank)
            .Where(a => a.UserId == userId)
            .OrderBy(a => a.CustomLabel)
            .ToListAsync();
    }

    public async Task<IEnumerable<BankAccount>> GetByBudgetCategoryAsync(Guid userId, Guid categoryId)
    {
        return await _dbSet
            .Where(a => a.UserId == userId && a.BudgetCategoryId == categoryId)
            .ToListAsync();
    }

    public async Task<decimal> GetTotalBalanceAsync(Guid userId)
    {
        return await _dbSet
            .Where(a => a.UserId == userId)
            .SumAsync(a => a.Balance);
    }
}
