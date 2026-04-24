namespace BabylonWealth.Core.Interfaces.Repositories;

/// <summary>
/// Generic repository contract. T = entity type, TKey = primary key type (Guid throughout this app).
/// Every entity-specific repository extends this — no controller or service ever calls EF Core directly.
/// </summary>
public interface IBaseRepository<T, TKey> where T : class
{
    /// <summary>Returns a single entity by ID, scoped to the user. Returns null if not found or soft-deleted.</summary>
    Task<T?> GetByIdAsync(TKey id, Guid userId);

    /// <summary>Returns all non-deleted records owned by this user.</summary>
    Task<IEnumerable<T>> GetAllByUserAsync(Guid userId);

    /// <summary>Persists a new entity and returns it with CreatedAt populated.</summary>
    Task<T> CreateAsync(T entity);

    /// <summary>Persists changes to an existing entity and returns the updated version.</summary>
    Task<T> UpdateAsync(T entity);

    /// <summary>Sets IsDeleted = true and DeletedAt = now. Records are never physically removed.</summary>
    Task SoftDeleteAsync(TKey id, Guid userId);
}
