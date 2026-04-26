using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class AnnotationRepository : BaseRepository<NetWorthAnnotation, Guid>, IAnnotationRepository
{
    public AnnotationRepository(BabylonDbContext context) : base(context) { }

    public async Task<IEnumerable<NetWorthAnnotation>> GetByDateRangeAsync(Guid userId, DateTime from, DateTime to)
    {
        return await _dbSet
            .Where(a => a.UserId == userId && a.AnnotationDate >= from && a.AnnotationDate <= to)
            .OrderBy(a => a.AnnotationDate)
            .ToListAsync();
    }

    public async Task<NetWorthAnnotation?> GetBySnapshotIdAsync(Guid userId, Guid snapshotId)
    {
        return await _dbSet
            .FirstOrDefaultAsync(a => a.UserId == userId && a.SnapshotId == snapshotId);
    }

    public async Task<NetWorthAnnotation> UpsertAsync(Guid userId, DateTime annotationDate, string text, string? category = null, Guid? snapshotId = null)
    {
        var existing = await _dbSet
            .FirstOrDefaultAsync(a => a.UserId == userId &&
                                      a.AnnotationDate.Date == annotationDate.Date);

        if (existing is not null)
        {
            existing.Update(text, category);
            await _context.SaveChangesAsync();
            return existing;
        }

        var annotation = NetWorthAnnotation.Create(userId, annotationDate, text, category, snapshotId);
        _dbSet.Add(annotation);
        await _context.SaveChangesAsync();
        return annotation;
    }
}
