using BabylonWealth.Core.Entities;

namespace BabylonWealth.Core.Interfaces.Repositories;

/// <summary>
/// Banks are seeded reference data — not user-owned.
/// This interface does NOT extend IBaseRepository because banks have no userId scope,
/// are never soft-deleted by users, and have no CreateAsync / UpdateAsync user paths.
/// This is Interface Segregation in practice: only expose what this entity actually needs.
/// </summary>
public interface IBankRepository
{
    /// <summary>
    /// Case-insensitive search across Name and SearchAliases.
    /// Powers the autocomplete dropdown when a user adds a new account.
    /// </summary>
    Task<IEnumerable<Bank>> SearchAsync(string query, int maxResults = 10);

    /// <summary>Returns a single bank by ID — used to populate logo and name after selection.</summary>
    Task<Bank?> GetByIdAsync(Guid id);

    /// <summary>Returns all banks — used by BankSeeder to check if seeding is needed.</summary>
    Task<IEnumerable<Bank>> GetAllAsync();

    /// <summary>True if the Banks table has any rows. Seeder uses this to stay idempotent.</summary>
    Task<bool> AnyExistsAsync();
}
