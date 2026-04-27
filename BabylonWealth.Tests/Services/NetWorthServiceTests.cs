using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Services;
using Moq;

namespace BabylonWealth.Tests.Services;

public class NetWorthServiceTests
{
    private readonly Mock<IAccountRepository> _accountRepoMock = new();
    private readonly Mock<IInvestmentRepository> _investmentRepoMock = new();
    private readonly Mock<ICreditCardRepository> _creditCardRepoMock = new();
    private readonly Mock<ILoanRepository> _loanRepoMock = new();
    private readonly Mock<IPendingItemRepository> _pendingItemRepoMock = new();
    private readonly Mock<IPropertyRepository> _propertyRepoMock = new();
    private readonly NetWorthService _service;
    private readonly Guid _userId = Guid.NewGuid();

    public NetWorthServiceTests()
    {
        _service = new NetWorthService(
            _accountRepoMock.Object,
            _investmentRepoMock.Object,
            _creditCardRepoMock.Object,
            _loanRepoMock.Object,
            _pendingItemRepoMock.Object,
            _propertyRepoMock.Object);
    }

    // Convenience: set up all repos to return 0 so each test only configures what it needs
    private void SetupDefaults(
        decimal accountBalance = 0m,
        decimal investmentValue = 0m,
        decimal creditUsed = 0m,
        decimal creditLimit = 0m,
        decimal loanBalance = 0m,
        decimal pendingNet = 0m,
        decimal propertyEquity = 0m,
        bool hasProperties = false)
    {
        _accountRepoMock.Setup(r => r.GetTotalBalanceAsync(_userId)).ReturnsAsync(accountBalance);
        _investmentRepoMock.Setup(r => r.GetTotalValueAsync(_userId)).ReturnsAsync(investmentValue);
        _creditCardRepoMock.Setup(r => r.GetTotalBalanceAsync(_userId)).ReturnsAsync(creditUsed);
        _creditCardRepoMock.Setup(r => r.GetTotalCreditLimitAsync(_userId)).ReturnsAsync(creditLimit);
        _loanRepoMock.Setup(r => r.GetTotalOutstandingBalanceAsync(_userId)).ReturnsAsync(loanBalance);
        _pendingItemRepoMock.Setup(r => r.GetNetPendingAmountAsync(_userId)).ReturnsAsync(pendingNet);
        _propertyRepoMock.Setup(r => r.GetTotalEquityAsync(_userId)).ReturnsAsync(propertyEquity);
        _propertyRepoMock.Setup(r => r.HasPropertiesAsync(_userId)).ReturnsAsync(hasProperties);
    }

    // ── Asset summation ─────────────────────────────────────────────────────

    [Fact]
    public async Task ComputeAsync_WithAccountsAndInvestments_TotalAssetsIsSum()
    {
        SetupDefaults(accountBalance: 5_000m, investmentValue: 20_000m);

        var result = await _service.ComputeAsync(_userId);

        Assert.Equal(25_000m, result.TotalAssets);
    }

    [Fact]
    public async Task ComputeAsync_WithPositivePendingNet_IncludedInTotalAssets()
    {
        // Someone owes the user $500 — that's an asset
        SetupDefaults(accountBalance: 10_000m, pendingNet: 500m);

        var result = await _service.ComputeAsync(_userId);

        Assert.Equal(10_500m, result.TotalAssets);
        Assert.Equal(500m, result.PendingItemsNet);
    }

    // ── Liability summation ─────────────────────────────────────────────────

    [Fact]
    public async Task ComputeAsync_WithCreditCardsAndLoans_TotalLiabilitiesIsSum()
    {
        SetupDefaults(creditUsed: 3_000m, loanBalance: 15_000m);

        var result = await _service.ComputeAsync(_userId);

        Assert.Equal(18_000m, result.TotalLiabilities);
    }

    [Fact]
    public async Task ComputeAsync_WithNegativePendingNet_IncludedInTotalLiabilities()
    {
        // User owes someone $800 — that's a liability
        SetupDefaults(pendingNet: -800m);

        var result = await _service.ComputeAsync(_userId);

        Assert.Equal(800m, result.TotalLiabilities);
        Assert.Equal(-800m, result.PendingItemsNet);
    }

    // ── Liquid net worth ────────────────────────────────────────────────────

    [Fact]
    public async Task ComputeAsync_AssetsMinusLiabilities_LiquidNetWorthIsCorrect()
    {
        SetupDefaults(accountBalance: 10_000m, investmentValue: 30_000m, creditUsed: 5_000m, loanBalance: 15_000m);

        var result = await _service.ComputeAsync(_userId);

        // Assets = 40k, Liabilities = 20k
        Assert.Equal(40_000m, result.TotalAssets);
        Assert.Equal(20_000m, result.TotalLiabilities);
        Assert.Equal(20_000m, result.LiquidNetWorth);
    }

    [Fact]
    public async Task ComputeAsync_LiabilitiesExceedAssets_LiquidNetWorthIsNegative()
    {
        SetupDefaults(accountBalance: 1_000m, loanBalance: 50_000m, creditUsed: 5_000m);

        var result = await _service.ComputeAsync(_userId);

        Assert.True(result.LiquidNetWorth < 0);
        Assert.Equal(-54_000m, result.LiquidNetWorth);
    }

    // ── Property equity (liquid vs total split) ─────────────────────────────

    [Fact]
    public async Task ComputeAsync_WithPropertyEquity_TotalNetWorthIncludesEquity()
    {
        SetupDefaults(accountBalance: 20_000m, propertyEquity: 80_000m, hasProperties: true);

        var result = await _service.ComputeAsync(_userId);

        Assert.Equal(20_000m, result.LiquidNetWorth);
        Assert.Equal(100_000m, result.TotalNetWorth);
        Assert.Equal(80_000m, result.PropertyEquity);
    }

    [Fact]
    public async Task ComputeAsync_NoProperties_TotalNetWorthEqualsLiquidNetWorth()
    {
        SetupDefaults(accountBalance: 15_000m, propertyEquity: 0m, hasProperties: false);

        var result = await _service.ComputeAsync(_userId);

        Assert.Equal(result.LiquidNetWorth, result.TotalNetWorth);
        Assert.Equal(0m, result.PropertyEquity);
    }

    // ── HasProperties flag ──────────────────────────────────────────────────

    [Fact]
    public async Task ComputeAsync_WithSavedProperties_HasPropertiesIsTrue()
    {
        SetupDefaults(accountBalance: 10_000m, propertyEquity: 50_000m, hasProperties: true);

        var result = await _service.ComputeAsync(_userId);

        Assert.True(result.HasProperties);
    }

    [Fact]
    public async Task ComputeAsync_UnderwaterProperty_HasPropertiesIsTrueEvenWithZeroEquity()
    {
        // A property with LoanBalance >= CurrentEstimatedValue contributes 0 or negative equity,
        // but HasProperties must still be true so the frontend renders the second chart line.
        SetupDefaults(accountBalance: 5_000m, propertyEquity: 0m, hasProperties: true);

        var result = await _service.ComputeAsync(_userId);

        Assert.True(result.HasProperties);
        Assert.Equal(0m, result.PropertyEquity);
    }

    [Fact]
    public async Task ComputeAsync_NoSavedProperties_HasPropertiesIsFalse()
    {
        SetupDefaults(accountBalance: 15_000m, hasProperties: false);

        var result = await _service.ComputeAsync(_userId);

        Assert.False(result.HasProperties);
    }

    // ── Settled pending items ───────────────────────────────────────────────

    [Fact]
    public async Task ComputeAsync_SettledPendingItemsExcluded_RepoReturnsZeroNet()
    {
        // The repo's GetNetPendingAmountAsync already excludes settled items at the
        // repository level — only Pending-status items are summed.
        // When all items are settled, the repo returns 0.
        SetupDefaults(accountBalance: 5_000m, pendingNet: 0m);

        var result = await _service.ComputeAsync(_userId);

        Assert.Equal(5_000m, result.TotalAssets);
        Assert.Equal(0m, result.PendingItemsNet);
    }

    // ── Soft-deleted accounts ───────────────────────────────────────────────

    [Fact]
    public async Task ComputeAsync_SoftDeletedAccountsExcluded_RepoReturnsReducedBalance()
    {
        // EF Core global query filter excludes soft-deleted rows at the DB level.
        // When two accounts exist but one is soft-deleted, the repo returns only
        // the live account's balance (5000, not 10000).
        SetupDefaults(accountBalance: 5_000m);

        var result = await _service.ComputeAsync(_userId);

        Assert.Equal(5_000m, result.TotalAssets);
    }

    // ── Credit utilization ──────────────────────────────────────────────────

    [Fact]
    public async Task ComputeAsync_WithCreditCards_CreditUtilizationPercentIsCorrect()
    {
        SetupDefaults(creditUsed: 2_500m, creditLimit: 10_000m);

        var result = await _service.ComputeAsync(_userId);

        Assert.Equal(25.00m, result.CreditUtilizationPercent);
    }

    [Fact]
    public async Task ComputeAsync_NoCreditCards_CreditUtilizationPercentIsNull()
    {
        SetupDefaults(creditUsed: 0m, creditLimit: 0m);

        var result = await _service.ComputeAsync(_userId);

        Assert.Null(result.CreditUtilizationPercent);
    }

    // ── ComputeLiquidAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task ComputeLiquidAsync_ReturnsSameLiquidValueAsComputeAsync()
    {
        SetupDefaults(accountBalance: 10_000m, investmentValue: 5_000m, loanBalance: 8_000m);

        var liquid = await _service.ComputeLiquidAsync(_userId);
        var full = await _service.ComputeAsync(_userId);

        Assert.Equal(full.LiquidNetWorth, liquid);
    }
}
