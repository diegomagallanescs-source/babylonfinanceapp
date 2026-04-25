using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class NetWorthRepository : BaseRepository<NetWorthSnapshot, Guid>, INetWorthRepository
{
    public NetWorthRepository(BabylonDbContext context) : base(context) { }

    public async Task<NetWorthSnapshot?> GetLatestSnapshotAsync(Guid userId)
    {
        return await _dbSet
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.SnapshotDate)
            .FirstOrDefaultAsync();
    }

    public async Task<IEnumerable<NetWorthSnapshot>> GetHistoryAsync(Guid userId, DateTime from, DateTime to)
    {
        return await _dbSet
            .Where(s => s.UserId == userId && s.SnapshotDate >= from && s.SnapshotDate <= to)
            .OrderBy(s => s.SnapshotDate)
            .ToListAsync();
    }

    public async Task<DateTime?> GetLastSnapshotDateAsync(Guid userId)
    {
        return await _dbSet
            .Where(s => s.UserId == userId)
            .MaxAsync(s => (DateTime?)s.SnapshotDate);
    }

    public async Task AnnotateAsync(Guid snapshotId, Guid userId, string annotationText)
    {
        var snapshot = await _dbSet
            .FirstOrDefaultAsync(s => s.Id == snapshotId && s.UserId == userId);

        if (snapshot is null) return;

        snapshot.AddAnnotation(annotationText);
        await _context.SaveChangesAsync();
    }
}
