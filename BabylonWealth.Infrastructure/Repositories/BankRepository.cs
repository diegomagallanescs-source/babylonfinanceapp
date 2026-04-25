using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

/// <summary>
/// Banks are seeded reference data with no userId scope or user-initiated soft deletes.
/// This repository does NOT extend BaseRepository — it implements IBankRepository directly,
/// which only exposes the read-only and seeder-support operations this entity actually needs.
/// </summary>
public class BankRepository : IBankRepository
{
    private readonly BabylonDbContext _context;

    public BankRepository(BabylonDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Bank>> SearchAsync(string query, int maxResults = 10)
    {
        var lower = query.ToLower();
        return await _context.Banks
            .Where(b => b.Name.ToLower().Contains(lower) ||
                        (b.SearchAliases != null && b.SearchAliases.ToLower().Contains(lower)))
            .Take(maxResults)
            .ToListAsync();
    }

    public async Task<Bank?> GetByIdAsync(Guid id)
    {
        return await _context.Banks.FindAsync(id);
    }

    public async Task<IEnumerable<Bank>> GetAllAsync()
    {
        return await _context.Banks.ToListAsync();
    }

    public async Task<bool> AnyExistsAsync()
    {
        return await _context.Banks.AnyAsync();
    }
}
