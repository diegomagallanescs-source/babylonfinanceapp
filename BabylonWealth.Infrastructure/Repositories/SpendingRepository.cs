using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class SpendingRepository : BaseRepository<SpendingTransaction, Guid>, ISpendingRepository
{
    public SpendingRepository(BabylonDbContext context) : base(context) { }

    public async Task<IEnumerable<SpendingTransaction>> GetByMonthAsync(Guid userId, int month, int year)
    {
        return await _dbSet
            .Include(s => s.BudgetCategory)
            .Include(s => s.BankAccount)
            .Where(s => s.UserId == userId &&
                        s.TransactionDate.Month == month &&
                        s.TransactionDate.Year == year)
            .OrderByDescending(s => s.TransactionDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<SpendingTransaction>> GetByCategoryAsync(Guid userId, Guid categoryId)
    {
        return await _dbSet
            .Include(s => s.BudgetCategory)
            .Include(s => s.BankAccount)
            .Where(s => s.UserId == userId && s.BudgetCategoryId == categoryId)
            .OrderByDescending(s => s.TransactionDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<SpendingTransaction>> GetByAccountAsync(Guid userId, Guid accountId)
    {
        return await _dbSet
            .Include(s => s.BudgetCategory)
            .Include(s => s.BankAccount)
            .Where(s => s.UserId == userId && s.BankAccountId == accountId)
            .OrderByDescending(s => s.TransactionDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<(Guid CategoryId, decimal Total)>> GetCategoryTotalsForMonthAsync(Guid userId, int month, int year)
    {
        var rows = await _dbSet
            .Where(s => s.UserId == userId &&
                        s.TransactionDate.Month == month &&
                        s.TransactionDate.Year == year)
            .GroupBy(s => s.BudgetCategoryId)
            .Select(g => new { CategoryId = g.Key, Total = g.Sum(s => s.Amount) })
            .ToListAsync();

        return rows.Select(r => (r.CategoryId, r.Total));
    }
}
