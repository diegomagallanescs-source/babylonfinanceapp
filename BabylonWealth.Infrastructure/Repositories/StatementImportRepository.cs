using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class StatementImportRepository : BaseRepository<StatementImport, Guid>, IStatementImportRepository
{
    public StatementImportRepository(BabylonDbContext context) : base(context) { }

    public async Task<IEnumerable<StatementImport>> GetHistoryAsync(Guid userId)
    {
        return await _dbSet
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.Year)
            .ThenBy(s => s.Month)
            .ToListAsync();
    }

    public async Task<StatementImport?> GetByMonthYearAsync(Guid userId, int month, int year)
    {
        return await _dbSet
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Month == month && s.Year == year);
    }

    public async Task DeleteByYearAsync(Guid userId, int year)
    {
        var records = await _dbSet
            .Where(s => s.UserId == userId && s.Year == year)
            .ToListAsync();
        foreach (var r in records) r.SoftDelete();
        await _context.SaveChangesAsync();
    }
}
