using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

/// <summary>
/// Tracks what the river actually produces — passive income received vs. living expenses.
/// The ratio (passive income / monthly expenses) is the most important number in the app.
/// When it reaches 1.0, Arkad's goal is achieved: the river covers all lifestyle costs.
/// </summary>
public interface IPassiveIncomeService
{
    /// <summary>
    /// Full summary: current month total, annual total, 12-month trend, and the ratio.
    /// Called by GET /api/v1/investmentincome/summary
    /// Also called by the OptimalRiver modal to overlay the user's actual ratio.
    /// </summary>
    Task<PassiveIncomeSummaryDto> GetSummaryAsync(Guid userId);

    /// <summary>
    /// Total passive income received in a specific month.
    /// Used by SnapshotService to include in the biweekly snapshot record.
    /// </summary>
    Task<decimal> GetMonthlyTotalAsync(Guid userId, int month, int year);

    /// <summary>
    /// The ratio: passive income this month / total spending this month.
    /// Returns null if either value is zero or spending data is unavailable.
    /// The OptimalRiver modal displays this against the 100% target line.
    /// </summary>
    Task<decimal?> GetPassiveToExpensesRatioAsync(Guid userId);

    /// <summary>All passive income entries for the user, ordered newest first.</summary>
    Task<IEnumerable<InvestmentIncomeResponseDto>> GetAllAsync(Guid userId);

    /// <summary>Records a passive income receipt.</summary>
    Task<InvestmentIncomeResponseDto> CreateAsync(Guid userId, CreateInvestmentIncomeRequest request);

    /// <summary>Total passive income received in a given calendar year.</summary>
    Task<decimal> GetAnnualTotalAsync(Guid userId, int year);
}
