using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class InvestmentRepository : BaseRepository<Investment, Guid>, IInvestmentRepository
{
    public InvestmentRepository(BabylonDbContext context) : base(context) { }

    public async Task<IEnumerable<Investment>> GetByInvestmentTypeAsync(Guid userId, InvestmentType type)
    {
        return await _dbSet
            .Where(i => i.UserId == userId && i.InvestmentType == type)
            .ToListAsync();
    }

    public async Task<decimal> GetTotalValueAsync(Guid userId)
    {
        return await _dbSet
            .Where(i => i.UserId == userId)
            .SumAsync(i => i.CurrentValue);
    }
}
