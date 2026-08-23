using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class ProjectionRepository : BaseRepository<Projection, Guid>, IProjectionRepository
{
    public ProjectionRepository(BabylonDbContext context) : base(context) { }

    public async Task<IEnumerable<Projection>> GetAllOrderedAsync(Guid userId)
    {
        return await _dbSet
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
    }
}
