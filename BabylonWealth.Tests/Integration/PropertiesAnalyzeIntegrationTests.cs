using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Enums;

namespace BabylonWealth.Tests.Integration;

/// <summary>
/// Integration tests for POST /api/v1/properties/analyze.
/// The endpoint is stateless (pure math, no DB writes), but still requires a valid JWT.
///
/// Pre-calculated reference values (Green scenario):
///   Purchase $200k, 20% down → loan $160k
///   7% / 30yr → monthly P&amp;I ≈ $1,064.48
///   Maintenance reserve: $200k × 1% / 12 ≈ $166.67
///   Total monthly expenses: $1,064.48 + $200 + $100 + $50 + $166.67 ≈ $1,581.15
///   Effective rent: $2,000 × 95% = $1,900
///   Monthly cash flow: $1,900 − $1,581.15 ≈ +$318.85  → positive
///   Monthly NOI: $1,900 − $200 − $100 − $50 − $166.67 ≈ $1,383.33
///   Annual NOI: $16,600  →  Cap rate: $16,600 / $200,000 × 100 ≈ 8.30%
///   Deal signal: GREEN (cash flow positive AND cap rate ≥ 5%)
/// </summary>
public class PropertiesAnalyzeIntegrationTests : IClassFixture<BabylonWebApplicationFactory>
{
    private readonly HttpClient _client;

    // The API registers JsonStringEnumConverter globally; tests must match.
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public PropertiesAnalyzeIntegrationTests(BabylonWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ── Auth guard ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Analyze_WithoutJwt_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/properties/analyze", GreenDealRequest());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Green deal ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Analyze_GreenDeal_ReturnsDealSignalGreen()
    {
        var token = await RegisterAndGetToken("green@babylon.com");
        var result = await PostAnalyze(token, GreenDealRequest());

        Assert.Equal("Green", result.DealSignal.ToString());
    }

    [Fact]
    public async Task Analyze_GreenDeal_ReturnsPositiveCashFlow()
    {
        var token = await RegisterAndGetToken("cashflow@babylon.com");
        var result = await PostAnalyze(token, GreenDealRequest());

        Assert.True(result.MonthlyCashFlow > 0,
            $"Expected positive cash flow but got {result.MonthlyCashFlow}");
    }

    [Fact]
    public async Task Analyze_GreenDeal_ReturnsCapRateAbove5Pct()
    {
        var token = await RegisterAndGetToken("caprate@babylon.com");
        var result = await PostAnalyze(token, GreenDealRequest());

        Assert.True(result.CapRatePercent >= 5m,
            $"Expected cap rate ≥ 5% but got {result.CapRatePercent}%");
    }

    [Fact]
    public async Task Analyze_GreenDeal_MatchesKnownMetrics()
    {
        // Validates that the HTTP layer doesn't mangle the numbers computed
        // by PropertyAnalyzerService (which has its own unit tests).
        var token = await RegisterAndGetToken("metrics@babylon.com");
        var result = await PostAnalyze(token, GreenDealRequest());

        Assert.Equal(160_000m, result.LoanAmount);
        Assert.Equal(40_000m, result.CashToClose);
        Assert.Equal(2_000m, result.GrossMonthlyRent);
        Assert.Equal(1_900m, result.EffectiveMonthlyRent);  // 2000 × 95%

        // Monthly P&I for $160k at 7% / 30yr ≈ $1,064.48
        Assert.InRange(result.MonthlyPrincipalAndInterest, 1_064m, 1_065m);

        // Cap rate ≈ 8.3% — well above 5%
        Assert.InRange(result.CapRatePercent, 8m, 9m);

        // Cash flow ≈ +$318
        Assert.InRange(result.MonthlyCashFlow, 300m, 340m);

        // Amortization schedule should cover the first 12 months
        Assert.Equal(12, result.FirstTwelveMonths.Count());
    }

    // ── Red deal ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Analyze_RedDeal_ReturnsDealSignalRed()
    {
        // Purchase $500k, rent only $2k — deeply negative cash flow, cap rate < 0
        var token = await RegisterAndGetToken("red@babylon.com");
        var result = await PostAnalyze(token, RedDealRequest());

        Assert.Equal("Red", result.DealSignal.ToString());
    }

    [Fact]
    public async Task Analyze_RedDeal_ReturnsNegativeCashFlow()
    {
        var token = await RegisterAndGetToken("redneg@babylon.com");
        var result = await PostAnalyze(token, RedDealRequest());

        Assert.True(result.MonthlyCashFlow < 0,
            $"Expected negative cash flow but got {result.MonthlyCashFlow}");
    }

    // ── Yellow deal ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Analyze_YellowDeal_ReturnsDealSignalYellow()
    {
        // Positive cash flow but cap rate is between 4–5% → Yellow
        // Purchase $350k, 20% down ($70k), loan $280k
        // 7% / 30yr → monthly P&I ≈ $1,862.84
        // Expenses: $1,862.84 + $300 + $150 + $0 + $291.67 (1% of 350k/12) ≈ $2,604.51
        // Rent $2,700, 5% vacancy → effective $2,565
        // Cash flow: $2,565 − $2,604.51 ≈ −$39 (slightly negative)
        // NOI: $2,565 − $300 − $150 − $0 − $291.67 ≈ $1,823.33 → annual $21,880
        // Cap rate: $21,880 / $350,000 ≈ 6.25%... that would be Green actually.
        //
        // Let's use: Purchase $400k, 20% down ($80k), loan $320k
        // 7% / 30yr → monthly P&I ≈ $2,129.49
        // Expenses: $2,129.49 + $400 + $150 + $100 + $333.33 (1% of 400k/12) ≈ $3,112.82
        // Rent $3,200, 5% vacancy → effective $3,040
        // Cash flow: $3,040 − $3,112.82 ≈ −$72.82 (slightly negative)
        // That's still Red.
        //
        // Yellow scenario: cap rate ≥ 4% even if cash flow is negative, OR
        // cash flow positive but cap rate < 5%
        //
        // Easiest Yellow: cash flow slightly positive, cap rate 4–5%
        // Purchase $300k, 20% down ($60k), loan $240k
        // 7% / 30yr → monthly P&I ≈ $1,597.12 (300k * 0.006654 ≈ 1597)
        // Expenses: $1,597.12 + $250 + $100 + $50 + $250 (1% of 300k/12) ≈ $2,247.12
        // Rent $2,300, 5% vacancy → effective $2,185
        // Cash flow: $2,185 − $2,247.12 ≈ −$62.12 (negative)
        //
        // Hmm, let me try with lower interest rate for yellow.
        // Purchase $250k, 20% down ($50k), loan $200k
        // 5% / 30yr → monthly P&I ≈ $1,073.64
        // Maintenance: $250k × 1% / 12 ≈ $208.33
        // Expenses: $1,073.64 + $200 + $100 + $0 + $208.33 ≈ $1,581.97
        // Rent $1,700, 5% vacancy → effective $1,615
        // Cash flow: $1,615 − $1,581.97 ≈ +$33.03 (slightly positive)
        // NOI: $1,615 − $200 − $100 − $0 − $208.33 ≈ $1,106.67
        // Annual NOI: $13,280
        // Cap rate: $13,280 / $250,000 × 100 = 5.31% → that would be Green!
        //
        // For Yellow: cap rate between 4% and 5%, OR positive cash flow only.
        // Let's try: positive cash flow + cap rate < 5%.
        // Purchase $500k, 15% down ($75k), loan $425k
        // 3.5% / 30yr → monthly P&I ≈ $1,907.56
        // Maintenance: $500k × 0.5% / 12 ≈ $208.33
        // Expenses: $1,907.56 + $500 + $200 + $200 + $208.33 ≈ $3,015.89
        // Rent $3,200, 5% vacancy → effective $3,040
        // Cash flow: $3,040 − $3,015.89 ≈ +$24.11 (slightly positive)
        // NOI: $3,040 − $500 − $200 − $200 − $208.33 ≈ $1,931.67
        // Annual NOI: $23,180
        // Cap rate: $23,180 / $500,000 × 100 = 4.64% (between 4-5%, ≥ 4 but < 5)
        // Cash flow positive AND cap rate ≥ 4% but < 5% → YELLOW
        //
        // Wait, the signal logic is:
        // Green: cashFlow > 0 AND capRate >= 5%
        // Yellow: cashFlow > 0 OR capRate >= 4%
        // So: cashFlow > 0 AND capRate >= 4% (but < 5%) → Yellow (not Green since cap < 5%)
        //
        // With the above: cash flow ≈ +$24.11 and cap rate ≈ 4.64% → Yellow ✓
        var token = await RegisterAndGetToken("yellow@babylon.com");
        var result = await PostAnalyze(token, YellowDealRequest());

        Assert.Equal("Yellow", result.DealSignal.ToString());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<string> RegisterAndGetToken(string email)
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest
        {
            Email = email,
            Password = "Babylon1",
            FirstName = "Tester"
        });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        return auth!.Token;
    }

    private async Task<PropertyAnalysisResponseDto> PostAnalyze(
        string token, PropertyAnalysisRequestDto request)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/properties/analyze");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        // Use string-enum options to match the server's JsonStringEnumConverter.
        req.Content = JsonContent.Create(request, options: _jsonOptions);

        var response = await _client.SendAsync(req);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<PropertyAnalysisResponseDto>(_jsonOptions);
        return result!;
    }

    // ── Canonical deal inputs ─────────────────────────────────────────────────

    /// <summary>
    /// $200k purchase, 20% down, 7%/30yr, $2k rent, 5% vacancy, 1% maintenance.
    /// Yields: P&amp;I ≈ $1,064.48, cash flow ≈ +$319, cap rate ≈ 8.3% → Green.
    /// </summary>
    private static PropertyAnalysisRequestDto GreenDealRequest() => new()
    {
        PurchasePrice            = 200_000m,
        DownPaymentAmount        = 40_000m,
        LoanType                 = LoanType.Other,
        InterestRate             = 0.07m,
        LoanTermYears            = 30,
        MonthlyPropertyTax       = 200m,
        MonthlyInsurance         = 100m,
        MonthlyHoa               = 50m,
        ExpectedMonthlyRent      = 2_000m,
        VacancyRatePercent       = 0.05m,
        MaintenanceReservePercent = 0.01m
    };

    /// <summary>
    /// $500k purchase, 20% down, 7%/30yr, $2k rent, 10% vacancy, 2% maintenance.
    /// Yields deeply negative cash flow and negative cap rate → Red.
    /// </summary>
    private static PropertyAnalysisRequestDto RedDealRequest() => new()
    {
        PurchasePrice            = 500_000m,
        DownPaymentAmount        = 100_000m,
        LoanType                 = LoanType.Other,
        InterestRate             = 0.07m,
        LoanTermYears            = 30,
        MonthlyPropertyTax       = 600m,
        MonthlyInsurance         = 200m,
        MonthlyHoa               = 300m,
        ExpectedMonthlyRent      = 2_000m,
        VacancyRatePercent       = 0.10m,
        MaintenanceReservePercent = 0.02m
    };

    /// <summary>
    /// $500k purchase, 15% down, 3.5%/30yr, $3,200 rent, 5% vacancy, 0.5% maintenance.
    /// Yields slightly positive cash flow (~+$24) and cap rate ~4.64% (≥4% but &lt;5%) → Yellow.
    /// </summary>
    private static PropertyAnalysisRequestDto YellowDealRequest() => new()
    {
        PurchasePrice            = 500_000m,
        DownPaymentAmount        = 75_000m,
        LoanType                 = LoanType.Other,
        InterestRate             = 0.035m,
        LoanTermYears            = 30,
        MonthlyPropertyTax       = 500m,
        MonthlyInsurance         = 200m,
        MonthlyHoa               = 200m,
        ExpectedMonthlyRent      = 3_200m,
        VacancyRatePercent       = 0.05m,
        MaintenanceReservePercent = 0.005m
    };
}
