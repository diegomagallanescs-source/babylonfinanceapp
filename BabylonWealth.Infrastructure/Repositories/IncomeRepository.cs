using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class IncomeRepository : BaseRepository<IncomeSource, Guid>, IIncomeRepository
{
    public IncomeRepository(BabylonDbContext context) : base(context) { }

    public async Task<IEnumerable<IncomeSource>> GetActiveOnlyAsync(Guid userId)
    {
        return await _dbSet
            .Where(i => i.UserId == userId && i.IsActive)
            .ToListAsync();
    }

    public async Task<decimal> GetAnnualTotalAsync(Guid userId)
    {
        return await _dbSet
            .Where(i => i.UserId == userId && i.IsActive)
            .SumAsync(i => i.AnnualAmount);
    }
}
