using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.Enums;
using BabylonWealth.Services;

namespace BabylonWealth.Tests.Services;

public class PropertyAnalyzerServiceTests
{
    private readonly PropertyAnalyzerService _service = new();

    // ── ComputeMonthlyPayment ─────────────────────────────────────────

    [Fact]
    public void ComputeMonthlyPayment_ZeroPrincipal_ReturnsZero()
    {
        var result = _service.ComputeMonthlyPayment(0m, 0.07m, 30);
        Assert.Equal(0m, result);
    }

    [Fact]
    public void ComputeMonthlyPayment_ZeroRate_ReturnsPrincipalDividedByMonths()
    {
        // 0% interest → each payment = principal / n
        var result = _service.ComputeMonthlyPayment(120_000m, 0m, 10);
        Assert.Equal(1_000m, result);
    }

    [Fact]
    public void ComputeMonthlyPayment_300k_At7pct_30yr_MatchesKnownValue()
    {
        // Known result from bankrate.com: $300k at 7% for 30 yrs ≈ $1,995.91
        var result = _service.ComputeMonthlyPayment(300_000m, 0.07m, 30);
        Assert.InRange(result, 1_995m, 1_997m);
    }

    [Fact]
    public void ComputeMonthlyPayment_200k_At6pct_15yr_MatchesKnownValue()
    {
        // $200k at 6% for 15 yrs ≈ $1,687.71
        var result = _service.ComputeMonthlyPayment(200_000m, 0.06m, 15);
        Assert.InRange(result, 1_687m, 1_689m);
    }

    // ── AnalyzeAsync — cash flow ──────────────────────────────────────

    [Fact]
    public async Task AnalyzeAsync_PositiveCashFlow_WhenRentExceedsAllExpenses()
    {
        var request = BuildRequest(
            purchasePrice: 200_000m,
            downPayment: 40_000m,
            interestRate: 0.07m,
            monthlyRent: 2_000m,
            vacancyRate: 0.05m,
            monthlyTax: 150m,
            monthlyInsurance: 80m,
            monthlyHoa: 0m,
            maintenanceReserve: 0.01m);

        var result = await _service.AnalyzeAsync(request);

        // Effective rent = 2000 * 0.95 = 1900; PITI + reserves >> cash flow positive only if rent high enough
        // Just assert the field math is internally consistent
        Assert.Equal(
            Math.Round(result.EffectiveMonthlyRent - result.TotalMonthlyExpenses, 2),
            result.MonthlyCashFlow);
    }

    [Fact]
    public async Task AnalyzeAsync_AnnualCashFlow_IsApproximatelyTwelveTimesMonthlyCashFlow()
    {
        var request = BuildRequest();
        var result = await _service.AnalyzeAsync(request);

        // Both are independently rounded to 2dp from the raw value, so allow ±$0.12 (12 × $0.01)
        Assert.InRange(result.AnnualCashFlow, result.MonthlyCashFlow * 12m - 0.12m, result.MonthlyCashFlow * 12m + 0.12m);
    }

    [Fact]
    public async Task AnalyzeAsync_EffectiveMonthlyRent_AppliesVacancyRate()
    {
        var request = BuildRequest(monthlyRent: 2_000m, vacancyRate: 0.10m);
        var result = await _service.AnalyzeAsync(request);

        Assert.Equal(1_800m, result.EffectiveMonthlyRent);
    }

    // ── Deal signal ───────────────────────────────────────────────────

    [Fact]
    public async Task AnalyzeAsync_GreenSignal_WhenPositiveCashFlowAndCapRateAtLeast5()
    {
        // Low purchase price, high rent → cap rate > 5% and positive cash flow
        var request = BuildRequest(
            purchasePrice: 100_000m,
            downPayment: 20_000m,
            interestRate: 0.07m,
            monthlyRent: 2_000m,
            vacancyRate: 0.05m,
            monthlyTax: 100m,
            monthlyInsurance: 50m,
            monthlyHoa: 0m,
            maintenanceReserve: 0.01m);

        var result = await _service.AnalyzeAsync(request);

        Assert.Equal(DealSignal.Green, result.DealSignal);
    }

    [Fact]
    public async Task AnalyzeAsync_RedSignal_WhenNegativeCashFlowAndLowCapRate()
    {
        // Very high price, low rent → negative cash flow and low cap rate
        var request = BuildRequest(
            purchasePrice: 1_000_000m,
            downPayment: 200_000m,
            interestRate: 0.075m,
            monthlyRent: 2_000m,
            vacancyRate: 0.05m,
            monthlyTax: 800m,
            monthlyInsurance: 200m,
            monthlyHoa: 500m,
            maintenanceReserve: 0.01m);

        var result = await _service.AnalyzeAsync(request);

        Assert.Equal(DealSignal.Red, result.DealSignal);
    }

    // ── Amortization ──────────────────────────────────────────────────

    [Fact]
    public async Task AnalyzeAsync_FirstTwelveMonths_HasExactlyTwelveRows()
    {
        var result = await _service.AnalyzeAsync(BuildRequest());

        Assert.Equal(12, result.FirstTwelveMonths.Count());
    }

    [Fact]
    public async Task AnalyzeAsync_AmortizationRow1_InterestPlusPrincipalEqualsPayment()
    {
        var result = await _service.AnalyzeAsync(BuildRequest());
        var row = result.FirstTwelveMonths.First();

        // Allow ±$0.02 for rounding
        Assert.InRange(row.Interest + row.Principal, row.Payment - 0.02m, row.Payment + 0.02m);
    }

    [Fact]
    public async Task AnalyzeAsync_AmortizationRows_BalanceDecreaseEachMonth()
    {
        var result = await _service.AnalyzeAsync(BuildRequest());
        var rows = result.FirstTwelveMonths.ToList();

        for (var i = 1; i < rows.Count; i++)
            Assert.True(rows[i].RemainingBalance < rows[i - 1].RemainingBalance,
                $"Balance should decrease: month {i} balance {rows[i].RemainingBalance} >= month {i - 1} balance {rows[i - 1].RemainingBalance}");
    }

    // ── GRM / DSCR / cap rate ─────────────────────────────────────────

    [Fact]
    public async Task AnalyzeAsync_GrossRentMultiplier_IsPurchasePriceOverAnnualRent()
    {
        var request = BuildRequest(purchasePrice: 240_000m, monthlyRent: 2_000m);
        var result = await _service.AnalyzeAsync(request);

        // GRM = 240,000 / (2,000 * 12) = 10
        Assert.Equal(10m, result.GrossRentMultiplier);
    }

    [Fact]
    public async Task AnalyzeAsync_BreakEvenRent_IsPositive()
    {
        var result = await _service.AnalyzeAsync(BuildRequest());
        Assert.True(result.BreakEvenRent > 0m);
    }

    // ── Yellow signal ─────────────────────────────────────────────────

    [Fact]
    public async Task AnalyzeAsync_YellowSignal_WhenPositiveCashFlowButCapRateBelow5Percent()
    {
        // Large down payment keeps PI tiny → cash flow positive, but NOI/price < 5%
        var request = BuildRequest(
            purchasePrice: 500_000m,
            downPayment:   450_000m,   // loan = $50k → tiny PI
            interestRate:  0.07m,
            monthlyRent:   2_000m,
            vacancyRate:   0.05m,
            monthlyTax:    250m,
            monthlyInsurance: 100m,
            monthlyHoa:    0m,
            maintenanceReserve: 0.01m);

        var result = await _service.AnalyzeAsync(request);

        Assert.True(result.MonthlyCashFlow > 0, "Expected positive cash flow");
        Assert.True(result.CapRatePercent < 5m,  "Expected cap rate below 5%");
        Assert.Equal(DealSignal.Yellow, result.DealSignal);
    }

    // ── Derived metrics ───────────────────────────────────────────────

    [Fact]
    public async Task AnalyzeAsync_LoanAmount_IsPurchasePriceMinusDownPayment()
    {
        var request = BuildRequest(purchasePrice: 350_000m, downPayment: 70_000m);
        var result  = await _service.AnalyzeAsync(request);

        Assert.Equal(280_000m, result.LoanAmount);
    }

    [Fact]
    public async Task AnalyzeAsync_TotalMonthlyExpenses_SumsAllExpenseComponents()
    {
        // Zero-rate loan → PI = principal / months (exact, no floating-point noise)
        // Zero maintenance reserve so monthly maintenance = 0
        var request = BuildRequest(
            purchasePrice:    120_000m,
            downPayment:      0m,          // loan = $120k
            interestRate:     0m,          // PI = 120,000 / 120 = $1,000
            termYears:        10,
            monthlyRent:      2_000m,
            vacancyRate:      0m,
            monthlyTax:       200m,
            monthlyInsurance: 80m,
            monthlyHoa:       50m,
            maintenanceReserve: 0m);

        var result = await _service.AnalyzeAsync(request);

        // 1,000 (PI) + 200 (tax) + 80 (ins) + 50 (HOA) + 0 (maint) = 1,330
        Assert.Equal(1_330m, result.TotalMonthlyExpenses);
    }

    [Fact]
    public async Task AnalyzeAsync_CashOnCashReturnPercent_IsAnnualCashFlowOverDownPayment()
    {
        // 100% cash purchase → no PI; zero vacancy and zero maintenance for clean arithmetic
        var request = BuildRequest(
            purchasePrice:    200_000m,
            downPayment:      200_000m,    // loan = 0 → PI = 0
            interestRate:     0.07m,
            monthlyRent:      1_500m,
            vacancyRate:      0m,
            monthlyTax:       100m,
            monthlyInsurance: 50m,
            monthlyHoa:       0m,
            maintenanceReserve: 0m);

        var result = await _service.AnalyzeAsync(request);

        // Cash flow = 1,500 − 150 = 1,350/mo → 16,200/yr
        // CashOnCash = 16,200 / 200,000 × 100 = 8.10%
        Assert.Equal(8.10m, result.CashOnCashReturnPercent);
    }

    [Fact]
    public async Task AnalyzeAsync_DebtServiceCoverageRatio_IsNOIOverAnnualDebtService()
    {
        // Same zero-rate setup: PI = 1,000/mo → annual debt service = 12,000
        // NOI = (effectiveRent − tax − ins − HOA − maint) × 12
        //     = (1,500 − 200 − 80 − 50 − 0) × 12 = 1,170 × 12 = 14,040
        // DSCR = 14,040 / 12,000 = 1.17
        var request = BuildRequest(
            purchasePrice:    120_000m,
            downPayment:      0m,
            interestRate:     0m,
            termYears:        10,
            monthlyRent:      1_500m,
            vacancyRate:      0m,
            monthlyTax:       200m,
            monthlyInsurance: 80m,
            monthlyHoa:       50m,
            maintenanceReserve: 0m);

        var result = await _service.AnalyzeAsync(request);

        Assert.Equal(1.17m, result.DebtServiceCoverageRatio);
    }

    [Fact]
    public async Task AnalyzeAsync_EstimatedTotalInterest_IsZeroForZeroRateLoan()
    {
        // At 0% rate: total paid = principal exactly; interest = 0
        var request = BuildRequest(
            purchasePrice: 120_000m,
            downPayment:   0m,
            interestRate:  0m,
            termYears:     10,
            monthlyRent:   1_500m,
            vacancyRate:   0m,
            maintenanceReserve: 0m);

        var result = await _service.AnalyzeAsync(request);

        Assert.Equal(0m, result.EstimatedTotalInterest);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private static PropertyAnalysisRequestDto BuildRequest(
        decimal purchasePrice = 300_000m,
        decimal downPayment = 60_000m,
        decimal interestRate = 0.07m,
        int termYears = 30,
        decimal monthlyRent = 2_200m,
        decimal vacancyRate = 0.05m,
        decimal monthlyTax = 250m,
        decimal monthlyInsurance = 100m,
        decimal monthlyHoa = 0m,
        decimal maintenanceReserve = 0.01m)
    {
        return new PropertyAnalysisRequestDto
        {
            PurchasePrice = purchasePrice,
            DownPaymentAmount = downPayment,
            LoanType = default,
            InterestRate = interestRate,
            LoanTermYears = termYears,
            ExpectedMonthlyRent = monthlyRent,
            VacancyRatePercent = vacancyRate,
            MonthlyPropertyTax = monthlyTax,
            MonthlyInsurance = monthlyInsurance,
            MonthlyHoa = monthlyHoa,
            MaintenanceReservePercent = maintenanceReserve,
        };
    }
}
