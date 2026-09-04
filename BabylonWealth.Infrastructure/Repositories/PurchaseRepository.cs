using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class PurchaseRepository : BaseRepository<Purchase, Guid>, IPurchaseRepository
{
    public PurchaseRepository(BabylonDbContext context) : base(context) { }

    public async Task<IEnumerable<Purchase>> GetByMonthAsync(Guid userId, int month, int year)
    {
        return await _dbSet
            .Include(p => p.SpendingCategory)
            .Where(p => p.UserId == userId &&
                        p.PurchaseDate.Month == month &&
                        p.PurchaseDate.Year == year)
            .OrderByDescending(p => p.PurchaseDate)
            .ToListAsync();
    }

    public async Task DeleteByMonthAsync(Guid userId, int month, int year)
    {
        var records = await _dbSet
            .Where(p => p.UserId == userId &&
                        p.PurchaseDate.Month == month &&
                        p.PurchaseDate.Year == year)
            .ToListAsync();
        foreach (var r in records) r.SoftDelete();
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<(int Year, int Month, Guid CategoryId, string CategoryName, string CategoryColor, decimal Total)>>
        GetMonthlyTrendByCategoryAsync(Guid userId, DateTime from, DateTime to)
    {
        var rows = await _dbSet
            .Where(p => p.UserId == userId &&
                        p.PurchaseDate >= from &&
                        p.PurchaseDate <= to)
            .GroupBy(p => new
            {
                p.PurchaseDate.Year,
                p.PurchaseDate.Month,
                p.SpendingCategoryId,
                p.SpendingCategory.Name,
                p.SpendingCategory.Color
            })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                CategoryId = g.Key.SpendingCategoryId,
                CategoryName = g.Key.Name,
                CategoryColor = g.Key.Color,
                Total = g.Sum(p => p.Amount)
            })
            .OrderBy(r => r.Year).ThenBy(r => r.Month)
            .ToListAsync();

        return rows.Select(r => (r.Year, r.Month, r.CategoryId, r.CategoryName, r.CategoryColor, r.Total));
    }
}
