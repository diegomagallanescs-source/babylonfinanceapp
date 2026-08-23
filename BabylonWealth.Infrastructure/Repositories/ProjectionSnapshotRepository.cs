using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class ProjectionSnapshotRepository : BaseRepository<ProjectionSnapshot, Guid>, IProjectionSnapshotRepository
{
    public ProjectionSnapshotRepository(BabylonDbContext context) : base(context) { }

    public async Task<IEnumerable<ProjectionSnapshot>> GetByProjectionAsync(Guid userId, Guid projectionId)
    {
        return await _dbSet
            .Where(s => s.UserId == userId && s.ProjectionId == projectionId)
            .OrderBy(s => s.SnapshotDate)
            .ToListAsync();
    }

    public async Task<ProjectionSnapshot?> GetByDateAndKindAsync(
        Guid userId, Guid projectionId, DateTime snapshotDate, ProjectionSnapshotKind kind)
    {
        return await _dbSet.FirstOrDefaultAsync(s =>
            s.UserId == userId &&
            s.ProjectionId == projectionId &&
            s.SnapshotDate == snapshotDate &&
            s.Kind == kind);
    }

    public async Task<IEnumerable<ProjectionSnapshot>> GetAllForUserAsync(Guid userId)
    {
        return await _dbSet
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.SnapshotDate)
            .ToListAsync();
    }

    public async Task SoftDeleteByProjectionAsync(Guid userId, Guid projectionId)
    {
        var snapshots = await _dbSet
            .Where(s => s.UserId == userId && s.ProjectionId == projectionId)
            .ToListAsync();

        foreach (var s in snapshots) s.SoftDelete();
        await _context.SaveChangesAsync();
    }
}
