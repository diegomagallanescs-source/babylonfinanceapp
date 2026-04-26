using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;
using BabylonWealth.Services;
using BabylonWealth.Tests.Helpers;
using Moq;

namespace BabylonWealth.Tests.Services;

public class BudgetAnalyticsServiceTests
{
    private readonly Mock<ISpendingRepository> _spendingRepoMock = new();
    private readonly Mock<IBudgetCategoryRepository> _categoryRepoMock = new();
    private readonly Mock<IIncomeRepository> _incomeRepoMock = new();
    private readonly Mock<IBudgetCategoryService> _categoryServiceMock = new();
    private readonly BudgetAnalyticsService _service;
    private readonly Guid _userId = Guid.NewGuid();

    public BudgetAnalyticsServiceTests()
    {
        _service = new BudgetAnalyticsService(
            _spendingRepoMock.Object,
            _categoryRepoMock.Object,
            _incomeRepoMock.Object,
            _categoryServiceMock.Object);
    }

    // ── GetMonthlyAnalyticsAsync ─────────────────────────────────────────────

    [Fact]
    public async Task GetMonthlyAnalyticsAsync_WithSpendingData_ReturnsCorrectBreakdown()
    {
        var necessities = EntityFactory.MakeBudgetCategory(_userId, "Necessities", 0.50m, "#E05555", 1);
        var investing = EntityFactory.MakeBudgetCategory(_userId, "Investing", 0.15m, "#4CAF7D", 2);

        _categoryRepoMock
            .Setup(r => r.GetByDisplayOrderAsync(_userId))
            .ReturnsAsync([necessities, investing]);

        _spendingRepoMock
            .Setup(r => r.GetCategoryTotalsForMonthAsync(_userId, 4, 2026))
            .ReturnsAsync([(necessities.Id, 1800m), (investing.Id, 500m)]);

        _incomeRepoMock
            .Setup(r => r.GetAnnualTotalAsync(_userId))
            .ReturnsAsync(48_000m);

        var result = await _service.GetMonthlyAnalyticsAsync(_userId, 4, 2026);

        Assert.Equal(4, result.Month);
        Assert.Equal(2026, result.Year);
        Assert.Equal(4_000m, result.MonthlyIncome);
        Assert.Equal(2_300m, result.TotalSpent);
        Assert.Equal(1_700m, result.NetSavings);
        Assert.Equal(500m, result.TotalInvested);
        Assert.Equal(400m, result.ArkadSavingsTarget);
        Assert.Equal(2, result.CategoryBreakdowns.Count());
    }

    [Fact]
    public async Task GetMonthlyAnalyticsAsync_WithSpendingData_PerCategoryVarianceIsCorrect()
    {
        var necessities = EntityFactory.MakeBudgetCategory(_userId, "Necessities", 0.50m, "#E05555", 1);

        _categoryRepoMock
            .Setup(r => r.GetByDisplayOrderAsync(_userId))
            .ReturnsAsync([necessities]);

        _spendingRepoMock
            .Setup(r => r.GetCategoryTotalsForMonthAsync(_userId, 4, 2026))
            .ReturnsAsync([(necessities.Id, 1800m)]);

        _incomeRepoMock
            .Setup(r => r.GetAnnualTotalAsync(_userId))
            .ReturnsAsync(48_000m);

        var result = await _service.GetMonthlyAnalyticsAsync(_userId, 4, 2026);
        var breakdown = result.CategoryBreakdowns.Single();

        // Target = 50% * $4000 = $2000; Actual = $1800; Variance = $200 (under budget)
        Assert.Equal(1800m, breakdown.ActualAmount);
        Assert.Equal(0.45m, breakdown.ActualPercentage);
        Assert.Equal(200m, breakdown.Variance);
        Assert.False(breakdown.IsOverBudget);
    }

    [Fact]
    public async Task GetMonthlyAnalyticsAsync_NoSpendingForMonth_AllActualAmountsZero()
    {
        var necessities = EntityFactory.MakeBudgetCategory(_userId, "Necessities", 0.50m, "#E05555", 1);

        _categoryRepoMock
            .Setup(r => r.GetByDisplayOrderAsync(_userId))
            .ReturnsAsync([necessities]);

        _spendingRepoMock
            .Setup(r => r.GetCategoryTotalsForMonthAsync(_userId, 4, 2026))
            .ReturnsAsync([]);

        _incomeRepoMock
            .Setup(r => r.GetAnnualTotalAsync(_userId))
            .ReturnsAsync(48_000m);

        var result = await _service.GetMonthlyAnalyticsAsync(_userId, 4, 2026);
        var breakdown = result.CategoryBreakdowns.Single();

        Assert.Equal(0m, breakdown.ActualAmount);
        Assert.Equal(0m, breakdown.ActualPercentage);
        Assert.Equal(0m, result.TotalSpent);
        // Variance = target * income = 0.50 * 4000 = 2000 (all budget remaining)
        Assert.Equal(2_000m, breakdown.Variance);
    }

    [Fact]
    public async Task GetMonthlyAnalyticsAsync_OverBudgetCategory_IsOverBudgetTrue()
    {
        var necessities = EntityFactory.MakeBudgetCategory(_userId, "Necessities", 0.50m, "#E05555", 1);

        _categoryRepoMock
            .Setup(r => r.GetByDisplayOrderAsync(_userId))
            .ReturnsAsync([necessities]);

        // Spent $2500 against a $2000 target (50% of $4000)
        _spendingRepoMock
            .Setup(r => r.GetCategoryTotalsForMonthAsync(_userId, 4, 2026))
            .ReturnsAsync([(necessities.Id, 2500m)]);

        _incomeRepoMock
            .Setup(r => r.GetAnnualTotalAsync(_userId))
            .ReturnsAsync(48_000m);

        var result = await _service.GetMonthlyAnalyticsAsync(_userId, 4, 2026);
        var breakdown = result.CategoryBreakdowns.Single();

        Assert.True(breakdown.IsOverBudget);
        Assert.Equal(-500m, breakdown.Variance);
    }

    [Fact]
    public async Task GetMonthlyAnalyticsAsync_ZeroIncome_ActualPercentagesAreZeroWithoutThrowing()
    {
        var necessities = EntityFactory.MakeBudgetCategory(_userId, "Necessities", 0.50m, "#E05555", 1);

        _categoryRepoMock
            .Setup(r => r.GetByDisplayOrderAsync(_userId))
            .ReturnsAsync([necessities]);

        _spendingRepoMock
            .Setup(r => r.GetCategoryTotalsForMonthAsync(_userId, 4, 2026))
            .ReturnsAsync([(necessities.Id, 100m)]);

        _incomeRepoMock
            .Setup(r => r.GetAnnualTotalAsync(_userId))
            .ReturnsAsync(0m);

        var result = await _service.GetMonthlyAnalyticsAsync(_userId, 4, 2026);
        var breakdown = result.CategoryBreakdowns.Single();

        Assert.Equal(0m, breakdown.ActualPercentage);
        Assert.Equal(0m, result.MonthlyIncome);
    }

    [Fact]
    public async Task GetMonthlyAnalyticsAsync_InvestingCategorySpend_IncludedInTotalInvested()
    {
        var investing = EntityFactory.MakeBudgetCategory(_userId, "Investing", 0.15m, "#4CAF7D", 1);
        var travel = EntityFactory.MakeBudgetCategory(_userId, "Travel", 0.15m, "#1B7A6E", 2);

        _categoryRepoMock
            .Setup(r => r.GetByDisplayOrderAsync(_userId))
            .ReturnsAsync([investing, travel]);

        _spendingRepoMock
            .Setup(r => r.GetCategoryTotalsForMonthAsync(_userId, 4, 2026))
            .ReturnsAsync([(investing.Id, 600m), (travel.Id, 400m)]);

        _incomeRepoMock
            .Setup(r => r.GetAnnualTotalAsync(_userId))
            .ReturnsAsync(48_000m);

        var result = await _service.GetMonthlyAnalyticsAsync(_userId, 4, 2026);

        // Only "Investing" category counts toward TotalInvested
        Assert.Equal(600m, result.TotalInvested);
    }

    [Fact]
    public async Task GetMonthlyAnalyticsAsync_NoInvestingCategory_TotalInvestedIsZero()
    {
        var necessities = EntityFactory.MakeBudgetCategory(_userId, "Necessities", 0.50m, "#E05555", 1);

        _categoryRepoMock
            .Setup(r => r.GetByDisplayOrderAsync(_userId))
            .ReturnsAsync([necessities]);

        _spendingRepoMock
            .Setup(r => r.GetCategoryTotalsForMonthAsync(_userId, 4, 2026))
            .ReturnsAsync([(necessities.Id, 1800m)]);

        _incomeRepoMock
            .Setup(r => r.GetAnnualTotalAsync(_userId))
            .ReturnsAsync(48_000m);

        var result = await _service.GetMonthlyAnalyticsAsync(_userId, 4, 2026);

        Assert.Equal(0m, result.TotalInvested);
    }

    [Fact]
    public async Task GetMonthlyAnalyticsAsync_ArkadSavingsTarget_IsTenPercentOfMonthlyIncome()
    {
        _categoryRepoMock
            .Setup(r => r.GetByDisplayOrderAsync(_userId))
            .ReturnsAsync([]);

        _spendingRepoMock
            .Setup(r => r.GetCategoryTotalsForMonthAsync(_userId, 4, 2026))
            .ReturnsAsync([]);

        _incomeRepoMock
            .Setup(r => r.GetAnnualTotalAsync(_userId))
            .ReturnsAsync(60_000m);

        var result = await _service.GetMonthlyAnalyticsAsync(_userId, 4, 2026);

        // Monthly income = $5000; Arkad's 10% = $500
        Assert.Equal(5_000m, result.MonthlyIncome);
        Assert.Equal(500m, result.ArkadSavingsTarget);
    }

    [Fact]
    public async Task GetMonthlyAnalyticsAsync_CategoryBreakdownsOrderedByDisplayOrder()
    {
        var shopping = EntityFactory.MakeBudgetCategory(_userId, "Shopping", 0.10m, "#9C27B0", 3);
        var necessities = EntityFactory.MakeBudgetCategory(_userId, "Necessities", 0.50m, "#E05555", 1);
        var investing = EntityFactory.MakeBudgetCategory(_userId, "Investing", 0.15m, "#4CAF7D", 2);

        // Repository returns them already in display order
        _categoryRepoMock
            .Setup(r => r.GetByDisplayOrderAsync(_userId))
            .ReturnsAsync([necessities, investing, shopping]);

        _spendingRepoMock
            .Setup(r => r.GetCategoryTotalsForMonthAsync(_userId, 4, 2026))
            .ReturnsAsync([]);

        _incomeRepoMock
            .Setup(r => r.GetAnnualTotalAsync(_userId))
            .ReturnsAsync(48_000m);

        var result = await _service.GetMonthlyAnalyticsAsync(_userId, 4, 2026);
        var names = result.CategoryBreakdowns.Select(b => b.CategoryName).ToList();

        Assert.Equal(["Necessities", "Investing", "Shopping"], names);
    }

    // ── GetTotalMonthlySpendingAsync ─────────────────────────────────────────

    [Fact]
    public async Task GetTotalMonthlySpendingAsync_WithMultipleCategories_ReturnsSumOfAllTotals()
    {
        _spendingRepoMock
            .Setup(r => r.GetCategoryTotalsForMonthAsync(_userId, 4, 2026))
            .ReturnsAsync([(Guid.NewGuid(), 1800m), (Guid.NewGuid(), 600m), (Guid.NewGuid(), 400m)]);

        var result = await _service.GetTotalMonthlySpendingAsync(_userId, 4, 2026);

        Assert.Equal(2_800m, result);
    }

    [Fact]
    public async Task GetTotalMonthlySpendingAsync_NoTransactions_ReturnsZero()
    {
        _spendingRepoMock
            .Setup(r => r.GetCategoryTotalsForMonthAsync(_userId, 4, 2026))
            .ReturnsAsync([]);

        var result = await _service.GetTotalMonthlySpendingAsync(_userId, 4, 2026);

        Assert.Equal(0m, result);
    }

    // ── SeedDefaultCategoriesAsync ───────────────────────────────────────────

    [Fact]
    public async Task SeedDefaultCategoriesAsync_DelegatesToBudgetCategoryService()
    {
        _categoryServiceMock
            .Setup(s => s.SeedDefaultCategoriesAsync(_userId))
            .Returns(Task.CompletedTask);

        await _service.SeedDefaultCategoriesAsync(_userId);

        _categoryServiceMock.Verify(s => s.SeedDefaultCategoriesAsync(_userId), Times.Once);
    }
}
