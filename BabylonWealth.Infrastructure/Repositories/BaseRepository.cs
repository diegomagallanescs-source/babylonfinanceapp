using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

/// <summary>
/// Generic EF Core implementation of IBaseRepository.
/// T must extend BaseEntity so SoftDelete() and Touch() are available.
/// User scoping uses EF.Property to access UserId without requiring it on the base class —
/// all user-owned entities declare UserId directly but the generic constraint can't see it.
/// The global query filter on BabylonDbContext already excludes IsDeleted = true,
/// so no method here needs to re-check soft-delete status.
/// </summary>
public abstract class BaseRepository<T, TKey> : IBaseRepository<T, TKey>
    where T : BaseEntity<TKey>
{
    protected readonly BabylonDbContext _context;
    protected readonly DbSet<T> _dbSet;

    protected BaseRepository(BabylonDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public virtual async Task<T?> GetByIdAsync(TKey id, Guid userId)
    {
        return await _dbSet
            .Where(e => EF.Property<Guid>(e, "UserId") == userId)
            .FirstOrDefaultAsync(e => e.Id!.Equals(id));
    }

    public virtual async Task<IEnumerable<T>> GetAllByUserAsync(Guid userId)
    {
        return await _dbSet
            .Where(e => EF.Property<Guid>(e, "UserId") == userId)
            .ToListAsync();
    }

    public virtual async Task<T> CreateAsync(T entity)
    {
        _dbSet.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public virtual async Task<T> UpdateAsync(T entity)
    {
        entity.Touch();
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public virtual async Task SoftDeleteAsync(TKey id, Guid userId)
    {
        var entity = await GetByIdAsync(id, userId);
        if (entity is null) return;
        entity.SoftDelete();
        await _context.SaveChangesAsync();
    }
}
