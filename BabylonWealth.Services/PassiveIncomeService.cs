using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class PassiveIncomeService : IPassiveIncomeService
{
    private readonly IInvestmentIncomeRepository _repo;
    private readonly IBudgetAnalyticsService _budgetAnalytics;

    public PassiveIncomeService(
        IInvestmentIncomeRepository repo,
        IBudgetAnalyticsService budgetAnalytics)
    {
        _repo = repo;
        _budgetAnalytics = budgetAnalytics;
    }

    public async Task<IEnumerable<InvestmentIncomeResponseDto>> GetAllAsync(Guid userId)
    {
        var entries = await _repo.GetAllByUserAsync(userId);
        return entries.OrderByDescending(e => e.ReceivedDate).Select(ToDto);
    }

    public async Task<InvestmentIncomeResponseDto> CreateAsync(Guid userId, CreateInvestmentIncomeRequest request)
    {
        var entry = InvestmentIncome.Create(
            userId,
            request.SourceName,
            request.Type,
            request.Amount,
            request.ReceivedDate,
            request.Notes);

        await _repo.CreateAsync(entry);
        return ToDto(entry);
    }

    public async Task<decimal> GetMonthlyTotalAsync(Guid userId, int month, int year)
    {
        var entries = await _repo.GetByMonthAsync(userId, month, year);
        return entries.Sum(e => e.Amount);
    }

    public Task<decimal> GetAnnualTotalAsync(Guid userId, int year) =>
        _repo.GetAnnualTotalAsync(userId, year);

    public async Task<PassiveIncomeSummaryDto> GetSummaryAsync(Guid userId)
    {
        var now = DateTime.UtcNow;

        // Run independent queries sequentially — EF Core DbContext is not thread-safe
        var rawTrend = await _repo.GetMonthlyTotalsAsync(userId, 12);
        var currentYearTotal = await _repo.GetAnnualTotalAsync(userId, now.Year);
        var ratio = await GetPassiveToExpensesRatioAsync(userId);

        var trend = BuildTwelveMonthTrend(rawTrend, now);
        var currentMonthTotal = trend
            .FirstOrDefault(t => t.Year == now.Year && t.Month == now.Month)?.Total ?? 0m;

        return new PassiveIncomeSummaryDto
        {
            CurrentMonthTotal = currentMonthTotal,
            CurrentYearTotal = currentYearTotal,
            PassiveToExpensesRatio = ratio,
            TwelveMonthTrend = trend
        };
    }

    public async Task<decimal?> GetPassiveToExpensesRatioAsync(Guid userId)
    {
        var now = DateTime.UtcNow;
        var passiveIncome = await GetMonthlyTotalAsync(userId, now.Month, now.Year);
        var expenses = await _budgetAnalytics.GetTotalMonthlySpendingAsync(userId, now.Month, now.Year);

        if (passiveIncome == 0m || expenses == 0m)
            return null;

        return passiveIncome / expenses;
    }

    // Guarantees all 12 calendar months appear in the trend, even months with no income.
    private static List<MonthlyPassiveIncomeDto> BuildTwelveMonthTrend(
        IEnumerable<(int Year, int Month, decimal Total)> rawData,
        DateTime now)
    {
        var dataMap = rawData.ToDictionary(r => (r.Year, r.Month), r => r.Total);

        return Enumerable.Range(0, 12)
            .Select(i => now.AddMonths(-11 + i))
            .Select(d => new MonthlyPassiveIncomeDto
            {
                Year = d.Year,
                Month = d.Month,
                Total = dataMap.GetValueOrDefault((d.Year, d.Month), 0m)
            })
            .ToList();
    }

    private static InvestmentIncomeResponseDto ToDto(InvestmentIncome e) => new()
    {
        Id = e.Id,
        SourceName = e.SourceName,
        Type = e.Type,
        TypeLabel = e.Type.ToString(),
        Amount = e.Amount,
        ReceivedDate = e.ReceivedDate,
        Notes = e.Notes,
        CreatedAt = e.CreatedAt
    };
}
