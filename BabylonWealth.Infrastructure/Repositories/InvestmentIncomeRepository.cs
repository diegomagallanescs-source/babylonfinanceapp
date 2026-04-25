using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class InvestmentIncomeRepository : BaseRepository<InvestmentIncome, Guid>, IInvestmentIncomeRepository
{
    public InvestmentIncomeRepository(BabylonDbContext context) : base(context) { }

    public async Task<IEnumerable<InvestmentIncome>> GetByMonthAsync(Guid userId, int month, int year)
    {
        return await _dbSet
            .Where(i => i.UserId == userId &&
                        i.ReceivedDate.Month == month &&
                        i.ReceivedDate.Year == year)
            .ToListAsync();
    }

    public async Task<IEnumerable<(int Year, int Month, decimal Total)>> GetMonthlyTotalsAsync(Guid userId, int months = 12)
    {
        var cutoff = DateTime.UtcNow.AddMonths(-months);

        var rows = await _dbSet
            .Where(i => i.UserId == userId && i.ReceivedDate >= cutoff)
            .GroupBy(i => new { i.ReceivedDate.Year, i.ReceivedDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(i => i.Amount) })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToListAsync();

        return rows.Select(r => (r.Year, r.Month, r.Total));
    }

    public async Task<decimal> GetAnnualTotalAsync(Guid userId, int year)
    {
        return await _dbSet
            .Where(i => i.UserId == userId && i.ReceivedDate.Year == year)
            .SumAsync(i => i.Amount);
    }
}
