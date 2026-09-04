using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class SpendingCategoryRepository : BaseRepository<SpendingCategory, Guid>, ISpendingCategoryRepository
{
    public SpendingCategoryRepository(BabylonDbContext context) : base(context) { }

    public async Task<IEnumerable<SpendingCategory>> GetByDisplayOrderAsync(Guid userId)
    {
        return await _dbSet
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.DisplayOrder)
            .ToListAsync();
    }

    public async Task<bool> HasCategoriesAsync(Guid userId)
    {
        return await _dbSet.AnyAsync(c => c.UserId == userId);
    }
}
