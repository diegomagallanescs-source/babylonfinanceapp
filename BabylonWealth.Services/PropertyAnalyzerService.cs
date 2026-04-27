using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class PropertyAnalyzerService : IPropertyAnalyzerService
{
    public Task<PropertyAnalysisResponseDto> AnalyzeAsync(PropertyAnalysisRequestDto request)
    {
        var loanAmount = request.PurchasePrice - request.DownPaymentAmount;
        var monthlyPI = ComputeMonthlyPayment(loanAmount, request.InterestRate, request.LoanTermYears);

        var monthlyMaintenance = request.PurchasePrice * request.MaintenanceReservePercent / 12m;
        var totalMonthlyExpenses = monthlyPI
            + request.MonthlyPropertyTax
            + request.MonthlyInsurance
            + request.MonthlyHoa
            + monthlyMaintenance;

        var effectiveMonthlyRent = request.ExpectedMonthlyRent * (1m - request.VacancyRatePercent);
        var monthlyCashFlow = effectiveMonthlyRent - totalMonthlyExpenses;
        var annualCashFlow = monthlyCashFlow * 12m;

        // NOI = effective rent - operating expenses (excludes debt service)
        var monthlyNoi = effectiveMonthlyRent - request.MonthlyPropertyTax - request.MonthlyInsurance - request.MonthlyHoa - monthlyMaintenance;
        var annualNoi = monthlyNoi * 12m;
        var annualDebtService = monthlyPI * 12m;

        var capRatePercent = request.PurchasePrice > 0
            ? Math.Round(annualNoi / request.PurchasePrice * 100m, 2)
            : 0m;

        var totalCashInvested = request.DownPaymentAmount;
        var cashOnCashPercent = totalCashInvested > 0
            ? Math.Round(annualCashFlow / totalCashInvested * 100m, 2)
            : 0m;

        var annualGrossRent = request.ExpectedMonthlyRent * 12m;
        var grm = annualGrossRent > 0
            ? Math.Round(request.PurchasePrice / annualGrossRent, 2)
            : 0m;

        // Break-even: the rent that makes cash flow exactly 0
        // effectiveRent = gross * (1 - vacancy); solve for gross when effectiveRent = totalExpenses
        var effectiveVacancyMultiplier = 1m - request.VacancyRatePercent;
        var breakEvenRent = effectiveVacancyMultiplier > 0
            ? Math.Round(totalMonthlyExpenses / effectiveVacancyMultiplier, 2)
            : 0m;

        var dscr = annualDebtService > 0
            ? Math.Round(annualNoi / annualDebtService, 2)
            : 0m;

        var estimatedTotalInterest = (monthlyPI * request.LoanTermYears * 12m) - loanAmount;

        var (signal, explanation) = DetermineSignal(monthlyCashFlow, capRatePercent);

        var amortization = BuildAmortizationSchedule(loanAmount, request.InterestRate, request.LoanTermYears, monthlyPI);

        var response = new PropertyAnalysisResponseDto
        {
            LoanAmount                  = loanAmount,
            MonthlyPrincipalAndInterest = Math.Round(monthlyPI, 2),
            EstimatedTotalInterest      = Math.Round(estimatedTotalInterest, 2),
            CashToClose                 = request.DownPaymentAmount,
            GrossMonthlyRent            = request.ExpectedMonthlyRent,
            EffectiveMonthlyRent        = Math.Round(effectiveMonthlyRent, 2),
            TotalMonthlyExpenses        = Math.Round(totalMonthlyExpenses, 2),
            MonthlyCashFlow             = Math.Round(monthlyCashFlow, 2),
            AnnualCashFlow              = Math.Round(annualCashFlow, 2),
            CapRatePercent              = capRatePercent,
            CashOnCashReturnPercent     = cashOnCashPercent,
            GrossRentMultiplier         = grm,
            BreakEvenRent               = breakEvenRent,
            DebtServiceCoverageRatio    = dscr,
            DealSignal                  = signal,
            DealSignalExplanation       = explanation,
            FirstTwelveMonths           = amortization,
        };

        return Task.FromResult(response);
    }

    public decimal ComputeMonthlyPayment(decimal principal, decimal annualRate, int termYears)
    {
        if (principal <= 0) return 0m;
        if (annualRate <= 0) return termYears > 0 ? principal / (termYears * 12m) : 0m;

        var r = annualRate / 12m;
        var n = termYears * 12;
        var factor = (double)r * Math.Pow(1 + (double)r, n) / (Math.Pow(1 + (double)r, n) - 1);
        return (decimal)factor * principal;
    }

    private static (DealSignal signal, string explanation) DetermineSignal(decimal monthlyCashFlow, decimal capRatePercent)
    {
        if (monthlyCashFlow > 0 && capRatePercent >= 5m)
            return (DealSignal.Green, "Positive cash flow and cap rate ≥ 5% — strong deal.");

        if (monthlyCashFlow > 0 || capRatePercent >= 4m)
            return (DealSignal.Yellow, "Borderline deal — cash flow positive or cap rate ≥ 4%, but not both.");

        return (DealSignal.Red, "Negative cash flow and cap rate below 4% — deal does not pencil.");
    }

    private static List<AmortizationRowDto> BuildAmortizationSchedule(
        decimal principal, decimal annualRate, int termYears, decimal monthlyPayment)
    {
        var rows = new List<AmortizationRowDto>(12);
        var balance = principal;
        var monthlyRate = annualRate / 12m;

        for (var month = 1; month <= Math.Min(12, termYears * 12); month++)
        {
            var interest = Math.Round(balance * monthlyRate, 2);
            var principalPaid = Math.Round(monthlyPayment - interest, 2);
            balance = Math.Max(0m, balance - principalPaid);

            rows.Add(new AmortizationRowDto
            {
                Month            = month,
                Payment          = Math.Round(monthlyPayment, 2),
                Principal        = principalPaid,
                Interest         = interest,
                RemainingBalance = Math.Round(balance, 2),
            });
        }

        return rows;
    }
}
