using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;

namespace BabylonWealth.Core.Interfaces.Services;

/// <summary>
/// Pure calculation service for real estate deal analysis.
/// This service has NO database dependency — it takes a request DTO and returns a response DTO.
/// Saving a property is handled by the controller calling IPropertyRepository separately.
///
/// This separation is intentional: the stateless /analyze endpoint can be called as many times
/// as the user wants (live recalculation as they type) without any write operations.
/// </summary>
public interface IPropertyAnalyzerService
{
    /// <summary>
    /// Runs the full deal analysis: mortgage math, cash flow, cap rate,
    /// cash-on-cash return, GRM, DSCR, break-even rent, and deal signal.
    /// Also returns the first 12 months of amortization.
    /// </summary>
    Task<PropertyAnalysisResponseDto> AnalyzeAsync(PropertyAnalysisRequestDto request);

    /// <summary>
    /// Calculates the monthly mortgage payment using the standard amortization formula:
    /// M = P[r(1+r)^n] / [(1+r)^n - 1]
    /// Exposed separately so the frontend can show a live payment estimate
    /// before the user runs the full analysis.
    /// </summary>
    decimal ComputeMonthlyPayment(decimal principal, decimal annualRate, int termYears);
}
