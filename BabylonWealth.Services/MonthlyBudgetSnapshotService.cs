using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class MonthlyBudgetSnapshotService : IMonthlyBudgetSnapshotService
{
    private readonly IMonthlyBudgetSnapshotRepository _repo;
    private readonly IBudgetAnalyticsService _budgetAnalytics;

    public MonthlyBudgetSnapshotService(
        IMonthlyBudgetSnapshotRepository repo,
        IBudgetAnalyticsService budgetAnalytics)
    {
        _repo = repo;
        _budgetAnalytics = budgetAnalytics;
    }

    public async Task<bool> ShouldTakeBudgetSnapshotAsync(Guid userId, int month, int year)
    {
        return !await _repo.ExistsForMonthAsync(userId, month, year);
    }

    public async Task TakeBudgetSnapshotAsync(Guid userId, int month, int year)
    {
        if (!await ShouldTakeBudgetSnapshotAsync(userId, month, year))
            return;

        var analytics = await _budgetAnalytics.GetMonthlyAnalyticsAsync(userId, month, year);

        var snapshot = MonthlyBudgetSnapshot.Create(
            userId,
            month,
            year,
            totalIncome: analytics.MonthlyIncome,
            totalSpending: analytics.TotalSpent,
            totalInvested: analytics.TotalInvested);

        await _repo.CreateAsync(snapshot);
    }
}
