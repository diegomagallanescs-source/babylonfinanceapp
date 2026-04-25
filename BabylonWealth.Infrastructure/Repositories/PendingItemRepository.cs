using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class PendingItemRepository : BaseRepository<PendingItem, Guid>, IPendingItemRepository
{
    public PendingItemRepository(BabylonDbContext context) : base(context) { }

    public async Task<IEnumerable<PendingItem>> GetPendingOnlyAsync(Guid userId)
    {
        return await _dbSet
            .Where(p => p.UserId == userId && p.Status == PendingItemStatus.Pending)
            .ToListAsync();
    }

    public async Task SettleAsync(Guid id, Guid userId)
    {
        var item = await GetByIdAsync(id, userId);
        if (item is null) return;

        item.Settle();
        await _context.SaveChangesAsync();
    }

    public async Task<decimal> GetNetPendingAmountAsync(Guid userId)
    {
        return await _dbSet
            .Where(p => p.UserId == userId && p.Status == PendingItemStatus.Pending)
            .SumAsync(p => p.Amount);
    }
}
