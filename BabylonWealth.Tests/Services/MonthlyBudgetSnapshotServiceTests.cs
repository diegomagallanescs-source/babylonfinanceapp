using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;
using BabylonWealth.Services;
using Moq;

namespace BabylonWealth.Tests.Services;

public class MonthlyBudgetSnapshotServiceTests
{
    private readonly Mock<IMonthlyBudgetSnapshotRepository> _repoMock = new();
    private readonly Mock<IBudgetAnalyticsService> _analyticsMock = new();
    private readonly MonthlyBudgetSnapshotService _service;
    private readonly Guid _userId = Guid.NewGuid();

    public MonthlyBudgetSnapshotServiceTests()
    {
        _service = new MonthlyBudgetSnapshotService(
            _repoMock.Object,
            _analyticsMock.Object);
    }

    // ── ShouldTakeBudgetSnapshotAsync ────────────────────────────────────────

    [Fact]
    public async Task ShouldTakeBudgetSnapshotAsync_WhenNoSnapshotExists_ReturnsTrue()
    {
        _repoMock
            .Setup(r => r.ExistsForMonthAsync(_userId, 3, 2026))
            .ReturnsAsync(false);

        var result = await _service.ShouldTakeBudgetSnapshotAsync(_userId, 3, 2026);

        Assert.True(result);
    }

    [Fact]
    public async Task ShouldTakeBudgetSnapshotAsync_WhenSnapshotAlreadyExists_ReturnsFalse()
    {
        _repoMock
            .Setup(r => r.ExistsForMonthAsync(_userId, 3, 2026))
            .ReturnsAsync(true);

        var result = await _service.ShouldTakeBudgetSnapshotAsync(_userId, 3, 2026);

        Assert.False(result);
    }

    // ── TakeBudgetSnapshotAsync ──────────────────────────────────────────────

    [Fact]
    public async Task TakeBudgetSnapshotAsync_WhenSnapshotAlreadyExists_DoesNotCallAnalyticsOrRepo()
    {
        _repoMock
            .Setup(r => r.ExistsForMonthAsync(_userId, 3, 2026))
            .ReturnsAsync(true);

        await _service.TakeBudgetSnapshotAsync(_userId, 3, 2026);

        _analyticsMock.Verify(s => s.GetMonthlyAnalyticsAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
        _repoMock.Verify(r => r.CreateAsync(It.IsAny<MonthlyBudgetSnapshot>()), Times.Never);
    }

    [Fact]
    public async Task TakeBudgetSnapshotAsync_WhenNoSnapshotExists_CreatesSnapshotWithCorrectValues()
    {
        _repoMock
            .Setup(r => r.ExistsForMonthAsync(_userId, 3, 2026))
            .ReturnsAsync(false);

        _analyticsMock
            .Setup(s => s.GetMonthlyAnalyticsAsync(_userId, 3, 2026))
            .ReturnsAsync(new BudgetAnalyticsResponseDto
            {
                Month = 3,
                Year = 2026,
                MonthlyIncome = 5_000m,
                TotalSpent = 3_200m,
                NetSavings = 1_800m,
                TotalInvested = 750m,
                ArkadSavingsTarget = 500m,
                CategoryBreakdowns = []
            });

        MonthlyBudgetSnapshot? captured = null;
        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<MonthlyBudgetSnapshot>()))
            .Callback<MonthlyBudgetSnapshot>(s => captured = s)
            .ReturnsAsync((MonthlyBudgetSnapshot s) => s);

        await _service.TakeBudgetSnapshotAsync(_userId, 3, 2026);

        Assert.NotNull(captured);
        Assert.Equal(_userId, captured.UserId);
        Assert.Equal(3, captured.Month);
        Assert.Equal(2026, captured.Year);
        Assert.Equal(5_000m, captured.TotalIncome);
        Assert.Equal(3_200m, captured.TotalSpending);
        Assert.Equal(750m, captured.TotalInvested);
    }

    [Fact]
    public async Task TakeBudgetSnapshotAsync_SavingsRateIsInvestedOverIncome()
    {
        _repoMock
            .Setup(r => r.ExistsForMonthAsync(_userId, 3, 2026))
            .ReturnsAsync(false);

        _analyticsMock
            .Setup(s => s.GetMonthlyAnalyticsAsync(_userId, 3, 2026))
            .ReturnsAsync(new BudgetAnalyticsResponseDto
            {
                Month = 3,
                Year = 2026,
                MonthlyIncome = 4_000m,
                TotalSpent = 3_000m,
                NetSavings = 1_000m,
                TotalInvested = 600m,
                ArkadSavingsTarget = 400m,
                CategoryBreakdowns = []
            });

        MonthlyBudgetSnapshot? captured = null;
        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<MonthlyBudgetSnapshot>()))
            .Callback<MonthlyBudgetSnapshot>(s => captured = s)
            .ReturnsAsync((MonthlyBudgetSnapshot s) => s);

        await _service.TakeBudgetSnapshotAsync(_userId, 3, 2026);

        // SavingsRate = TotalInvested / TotalIncome = 600 / 4000 = 0.15
        Assert.NotNull(captured);
        Assert.Equal(0.15m, captured.SavingsRate);
    }

    [Fact]
    public async Task TakeBudgetSnapshotAsync_ZeroIncome_SavingsRateIsZeroWithoutThrowing()
    {
        _repoMock
            .Setup(r => r.ExistsForMonthAsync(_userId, 3, 2026))
            .ReturnsAsync(false);

        _analyticsMock
            .Setup(s => s.GetMonthlyAnalyticsAsync(_userId, 3, 2026))
            .ReturnsAsync(new BudgetAnalyticsResponseDto
            {
                Month = 3,
                Year = 2026,
                MonthlyIncome = 0m,
                TotalSpent = 0m,
                NetSavings = 0m,
                TotalInvested = 0m,
                ArkadSavingsTarget = 0m,
                CategoryBreakdowns = []
            });

        MonthlyBudgetSnapshot? captured = null;
        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<MonthlyBudgetSnapshot>()))
            .Callback<MonthlyBudgetSnapshot>(s => captured = s)
            .ReturnsAsync((MonthlyBudgetSnapshot s) => s);

        await _service.TakeBudgetSnapshotAsync(_userId, 3, 2026);

        Assert.NotNull(captured);
        Assert.Equal(0m, captured.SavingsRate);
    }

    [Theory]
    [InlineData(1, 2026, 12, 2025)]   // January → snapshots previous December
    [InlineData(4, 2026, 3, 2026)]    // April → snapshots previous March
    [InlineData(12, 2026, 11, 2026)]  // December → snapshots previous November
    public void PreviousMonthLogic_IsCorrect(int currentMonth, int currentYear, int expectedMonth, int expectedYear)
    {
        // This mirrors the logic in SnapshotBackgroundService.TryTakeMonthlyBudgetSnapshotAsync
        var targetMonth = currentMonth == 1 ? 12 : currentMonth - 1;
        var targetYear  = currentMonth == 1 ? currentYear - 1 : currentYear;

        Assert.Equal(expectedMonth, targetMonth);
        Assert.Equal(expectedYear, targetYear);
    }
}
