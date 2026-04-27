using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class PropertyRepository : BaseRepository<Property, Guid>, IPropertyRepository
{
    public PropertyRepository(BabylonDbContext context) : base(context) { }

    public async Task<decimal> GetTotalEquityAsync(Guid userId)
    {
        return await _dbSet
            .Where(p => p.UserId == userId)
            .SumAsync(p => p.CurrentEstimatedValue - p.LoanBalance);
    }

    public async Task<IEnumerable<Property>> GetStaleValuationsAsync(Guid userId, int staleDays = 90)
    {
        var cutoff = DateTime.UtcNow.AddDays(-staleDays);

        return await _dbSet
            .Where(p => p.UserId == userId &&
                        (p.LastValueUpdateDate == null || p.LastValueUpdateDate < cutoff))
            .ToListAsync();
    }

    public async Task<bool> HasPropertiesAsync(Guid userId)
    {
        return await _dbSet.AnyAsync(p => p.UserId == userId);
    }
}
