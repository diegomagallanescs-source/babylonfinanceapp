using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BabylonWealth.Infrastructure.Repositories;

public class LoanRepository : BaseRepository<Loan, Guid>, ILoanRepository
{
    public LoanRepository(BabylonDbContext context) : base(context) { }

    public async Task<IEnumerable<Loan>> GetByLoanTypeAsync(Guid userId, LoanType type)
    {
        return await _dbSet
            .Where(l => l.UserId == userId && l.LoanType == type)
            .ToListAsync();
    }

    public async Task<decimal> GetTotalOutstandingBalanceAsync(Guid userId)
    {
        return await _dbSet
            .Where(l => l.UserId == userId)
            .SumAsync(l => l.Balance);
    }
}
