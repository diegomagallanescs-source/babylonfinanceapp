using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class BudgetAnalyticsService : IBudgetAnalyticsService
{
    private readonly ISpendingRepository _spendingRepo;
    private readonly IBudgetCategoryRepository _categoryRepo;
    private readonly IIncomeRepository _incomeRepo;
    private readonly IBudgetCategoryService _categoryService;

    public BudgetAnalyticsService(
        ISpendingRepository spendingRepo,
        IBudgetCategoryRepository categoryRepo,
        IIncomeRepository incomeRepo,
        IBudgetCategoryService categoryService)
    {
        _spendingRepo = spendingRepo;
        _categoryRepo = categoryRepo;
        _incomeRepo = incomeRepo;
        _categoryService = categoryService;
    }

    public async Task<BudgetAnalyticsResponseDto> GetMonthlyAnalyticsAsync(Guid userId, int month, int year)
    {
        // Sequential — EF Core's DbContext is not thread-safe; Task.WhenAll would cause concurrency errors
        var categories = await _categoryRepo.GetByDisplayOrderAsync(userId);
        var totals = await _spendingRepo.GetCategoryTotalsForMonthAsync(userId, month, year);
        var annualIncome = await _incomeRepo.GetAnnualTotalAsync(userId);

        var totalsMap = totals.ToDictionary(t => t.CategoryId, t => t.Total);
        var monthlyIncome = annualIncome / 12m;

        var breakdowns = categories.Select(cat =>
        {
            var actual = totalsMap.GetValueOrDefault(cat.Id, 0m);
            var actualPct = monthlyIncome > 0 ? actual / monthlyIncome : 0m;
            var variance = (cat.TargetPercentage * monthlyIncome) - actual;

            return new CategoryBreakdownDto
            {
                CategoryId = cat.Id,
                CategoryName = cat.Name,
                Color = cat.Color,
                TargetPercentage = cat.TargetPercentage,
                ActualAmount = actual,
                ActualPercentage = actualPct,
                Variance = variance
            };
        }).ToList();

        var totalSpent = breakdowns.Sum(b => b.ActualAmount);

        var totalInvested = breakdowns
            .Where(b => b.CategoryName.Equals("Investing", StringComparison.OrdinalIgnoreCase))
            .Sum(b => b.ActualAmount);

        return new BudgetAnalyticsResponseDto
        {
            Month = month,
            Year = year,
            MonthlyIncome = monthlyIncome,
            TotalSpent = totalSpent,
            NetSavings = monthlyIncome - totalSpent,
            CategoryBreakdowns = breakdowns,
            TotalInvested = totalInvested,
            ArkadSavingsTarget = monthlyIncome * 0.10m
        };
    }

    public async Task<decimal> GetTotalMonthlySpendingAsync(Guid userId, int month, int year)
    {
        var totals = await _spendingRepo.GetCategoryTotalsForMonthAsync(userId, month, year);
        return totals.Sum(t => t.Total);
    }

    public Task SeedDefaultCategoriesAsync(Guid userId) =>
        _categoryService.SeedDefaultCategoriesAsync(userId);
}
