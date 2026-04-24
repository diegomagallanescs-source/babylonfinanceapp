using BabylonWealth.Core.Enums;

namespace BabylonWealth.Core.DTOs.Requests;

/// <summary>Input to POST /api/v1/properties/analyze and POST /api/v1/properties (save + analyze).</summary>
public record PropertyAnalysisRequestDto
{
    public decimal PurchasePrice { get; init; }
    public decimal DownPaymentAmount { get; init; }
    public LoanType LoanType { get; init; }
    public decimal InterestRate { get; init; }              // e.g. 0.07 for 7%
    public int LoanTermYears { get; init; }                 // typically 30
    public decimal MonthlyPropertyTax { get; init; }
    public decimal MonthlyInsurance { get; init; }
    public decimal MonthlyHoa { get; init; }
    public decimal ExpectedMonthlyRent { get; init; }
    public decimal VacancyRatePercent { get; init; }        // e.g. 0.05 for 5%
    public decimal MaintenanceReservePercent { get; init; } // e.g. 0.01 for 1% of value/year
}