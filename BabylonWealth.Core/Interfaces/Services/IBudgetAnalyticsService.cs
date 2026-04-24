using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

/// <summary>
/// Computes spending vs. budget analytics for a given month.
/// Read-only: this service never writes to the database.
/// All results are derived from SpendingTransactions + BudgetCategories + IncomeSources.
/// </summary>
public interface IBudgetAnalyticsService
{
    /// <summary>
    /// Full monthly breakdown: actual vs. target per category, net savings, total invested.
    /// Called by GET /api/v1/spending/analytics?month=&year=
    /// </summary>
    Task<BudgetAnalyticsResponseDto> GetMonthlyAnalyticsAsync(Guid userId, int month, int year);

    /// <summary>
    /// Returns the total amount spent across all categories for a given month.
    /// Used by PassiveIncomeService to compute the passive income / expenses ratio.
    /// </summary>
    Task<decimal> GetTotalMonthlySpendingAsync(Guid userId, int month, int year);

    /// <summary>
    /// Seeds the five default Arkad categories for a brand-new user.
    /// Called once from AuthService on registration — skipped if categories already exist.
    /// Necessities 50% | Investing 15% | Travel 15% | Savings 10% | Shopping 10%
    /// </summary>
    Task SeedDefaultCategoriesAsync(Guid userId);
}
