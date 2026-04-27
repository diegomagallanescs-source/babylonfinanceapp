using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class MonthlyBudgetSnapshotRepository : BaseRepository<MonthlyBudgetSnapshot, Guid>, IMonthlyBudgetSnapshotRepository
{
    public MonthlyBudgetSnapshotRepository(BabylonDbContext context) : base(context) { }

    public async Task<bool> ExistsForMonthAsync(Guid userId, int month, int year)
    {
        return await _dbSet
            .AnyAsync(s => s.UserId == userId && s.Month == month && s.Year == year);
    }
}
