using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class CheckingStatementImportRepository
    : BaseRepository<CheckingStatementImport, Guid>, ICheckingStatementImportRepository
{
    public CheckingStatementImportRepository(BabylonDbContext context) : base(context) { }

    public async Task<IEnumerable<CheckingStatementImport>> GetHistoryAsync(Guid userId)
    {
        return await _dbSet
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.Year)
            .ThenBy(c => c.Month)
            .ToListAsync();
    }

    public async Task<CheckingStatementImport?> GetByMonthYearAsync(Guid userId, int month, int year)
    {
        return await _dbSet
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Month == month && c.Year == year);
    }
}
