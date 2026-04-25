using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class BudgetCategoryRepository : BaseRepository<BudgetCategory, Guid>, IBudgetCategoryRepository
{
    public BudgetCategoryRepository(BabylonDbContext context) : base(context) { }

    public async Task<IEnumerable<BudgetCategory>> GetByDisplayOrderAsync(Guid userId)
    {
        return await _dbSet
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.DisplayOrder)
            .ToListAsync();
    }

    public async Task<decimal> GetTotalPercentageAsync(Guid userId, Guid? excludeCategoryId = null)
    {
        var query = _dbSet.Where(c => c.UserId == userId);

        if (excludeCategoryId.HasValue)
            query = query.Where(c => c.Id != excludeCategoryId.Value);

        return await query.SumAsync(c => c.TargetPercentage);
    }

    public async Task<bool> HasCategoriesAsync(Guid userId)
    {
        return await _dbSet.AnyAsync(c => c.UserId == userId);
    }
}
