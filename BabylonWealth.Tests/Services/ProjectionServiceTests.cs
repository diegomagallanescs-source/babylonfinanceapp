using System.Text.Json;
using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Services;
using Moq;

namespace BabylonWealth.Tests.Services;

public class ProjectionServiceTests
{
    private readonly Mock<IProjectionRepository> _repoMock = new();
    private readonly Mock<IProjectionSnapshotRepository> _snapshotRepoMock = new();
    private readonly ProjectionService _service;
    private readonly Guid _userId = Guid.NewGuid();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public ProjectionServiceTests()
    {
        _service = new ProjectionService(_repoMock.Object, _snapshotRepoMock.Object);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static ProjectionStateDto MakeState(
        decimal cash = 0m,
        decimal investments = 0m,
        decimal cardBalance = 0m,
        decimal loanBalance = 0m,
        decimal pending = 0m,
        string pendingStatus = "Pending",
        decimal propertyValue = 0m,
        decimal propertyLoan = 0m)
    {
        var state = new ProjectionStateDto();

        if (cash != 0m)
            state.Accounts.Add(new ProjectionAccountDto { Id = "a1", CustomLabel = "Checking", Balance = cash });
        if (investments != 0m)
            state.Investments.Add(new ProjectionInvestmentDto { Id = "i1", CustomLabel = "Brokerage", CurrentValue = investments });
        if (cardBalance != 0m)
            state.CreditCards.Add(new ProjectionCreditCardDto { Id = "c1", CustomLabel = "Visa", Balance = cardBalance });
        if (loanBalance != 0m)
            state.Loans.Add(new ProjectionLoanDto { Id = "l1", CustomLabel = "Auto", Balance = loanBalance });
        if (pending != 0m)
            state.PendingItems.Add(new ProjectionPendingItemDto { Id = "p1", Description = "Refund", Amount = pending, Status = pendingStatus });
        if (propertyValue != 0m || propertyLoan != 0m)
            state.Properties.Add(new ProjectionPropertyDto { Id = "r1", Address = "1 Main St", CurrentEstimatedValue = propertyValue, LoanBalance = propertyLoan });

        return state;
    }

    private Projection MakeProjection(ProjectionStateDto? state = null) =>
        Projection.Create(_userId, "Buy a duplex", "Testing 2027", JsonSerializer.Serialize(state ?? new ProjectionStateDto(), JsonOptions));

    // ── ComputeNetWorth ──────────────────────────────────────────────────────

    [Fact]
    public void ComputeNetWorth_WithAssetsAndLiabilities_MatchesNetWorthServiceFormula()
    {
        var state = MakeState(cash: 20_000m, investments: 55_000m, cardBalance: 3_000m, loanBalance: 12_000m);

        var (assets, liabilities, liquid, total) = ProjectionService.ComputeNetWorth(state);

        Assert.Equal(75_000m, assets);
        Assert.Equal(15_000m, liabilities);
        Assert.Equal(60_000m, liquid);
        Assert.Equal(60_000m, total);
    }

    [Fact]
    public void ComputeNetWorth_WithPositivePendingItem_CountsAsAsset()
    {
        var state = MakeState(cash: 1_000m, pending: 400m);

        var (assets, liabilities, liquid, _) = ProjectionService.ComputeNetWorth(state);

        Assert.Equal(1_400m, assets);
        Assert.Equal(0m, liabilities);
        Assert.Equal(1_400m, liquid);
    }

    [Fact]
    public void ComputeNetWorth_WithNegativePendingItem_CountsAsLiability()
    {
        var state = MakeState(cash: 1_000m, pending: -400m);

        var (assets, liabilities, liquid, _) = ProjectionService.ComputeNetWorth(state);

        Assert.Equal(1_000m, assets);
        Assert.Equal(400m, liabilities);
        Assert.Equal(600m, liquid);
    }

    [Fact]
    public void ComputeNetWorth_WithSettledPendingItem_ExcludesFromTotals()
    {
        var state = MakeState(cash: 1_000m, pending: 400m, pendingStatus: "Settled");

        var (assets, _, liquid, _) = ProjectionService.ComputeNetWorth(state);

        Assert.Equal(1_000m, assets);
        Assert.Equal(1_000m, liquid);
    }

    [Fact]
    public void ComputeNetWorth_WithProperty_AddsEquityToTotalOnly()
    {
        var state = MakeState(cash: 10_000m, propertyValue: 400_000m, propertyLoan: 250_000m);

        var (_, _, liquid, total) = ProjectionService.ComputeNetWorth(state);

        Assert.Equal(10_000m, liquid);
        Assert.Equal(160_000m, total);
    }

    [Fact]
    public void ComputeNetWorth_WithEmptyState_ReturnsZeros()
    {
        var (assets, liabilities, liquid, total) = ProjectionService.ComputeNetWorth(new ProjectionStateDto());

        Assert.Equal(0m, assets);
        Assert.Equal(0m, liabilities);
        Assert.Equal(0m, liquid);
        Assert.Equal(0m, total);
    }

    // ── CreateAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_WithSeedState_StoresLedgerAndReturnsIt()
    {
        var state = MakeState(cash: 5_000m, cardBalance: 800m);
        Projection? captured = null;

        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<Projection>()))
            .Callback<Projection>(p => captured = p)
            .ReturnsAsync((Projection p) => p);

        var result = await _service.CreateAsync(_userId, new CreateProjectionRequest
        {
            Name = "  Buy a duplex  ",
            Description = "  Testing 2027  ",
            State = state
        });

        Assert.NotNull(captured);
        Assert.Equal("Buy a duplex", captured!.Name);
        Assert.Equal("Testing 2027", captured.Description);
        Assert.Contains("5000", captured.WorkspaceStateJson);

        Assert.Equal("Buy a duplex", result.Name);
        Assert.Single(result.Workspace.Accounts);
        Assert.Empty(result.Snapshots);
    }

    [Fact]
    public async Task CreateAsync_WithoutState_StartsWithEmptyLedger()
    {
        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<Projection>()))
            .ReturnsAsync((Projection p) => p);

        var result = await _service.CreateAsync(_userId, new CreateProjectionRequest { Name = "Blank" });

        Assert.Empty(result.Workspace.Accounts);
        Assert.Empty(result.Workspace.Properties);
    }

    [Fact]
    public async Task CreateAsync_WithBlankName_ThrowsValidationException()
    {
        await Assert.ThrowsAsync<ValidationException>(
            () => _service.CreateAsync(_userId, new CreateProjectionRequest { Name = "   " }));

        _repoMock.Verify(r => r.CreateAsync(It.IsAny<Projection>()), Times.Never);
    }

    // ── AddSnapshotAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task AddSnapshotAsync_WithState_StoresComputedNetWorth()
    {
        var projection = MakeProjection();
        _repoMock.Setup(r => r.GetByIdAsync(projection.Id, _userId)).ReturnsAsync(projection);
        _snapshotRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<ProjectionSnapshot>()))
            .ReturnsAsync((ProjectionSnapshot s) => s);

        var result = await _service.AddSnapshotAsync(projection.Id, _userId, new CreateProjectionSnapshotRequest
        {
            SnapshotDate = new DateTime(2027, 6, 30),
            Kind = ProjectionSnapshotKind.Realized,
            Notes = "  after the down payment  ",
            State = MakeState(cash: 30_000m, cardBalance: 5_000m, propertyValue: 400_000m, propertyLoan: 300_000m)
        });

        Assert.Equal(ProjectionSnapshotKind.Realized, result.Kind);
        Assert.Equal(25_000m, result.LiquidNetWorth);
        Assert.Equal(125_000m, result.TotalNetWorth);
        Assert.Equal("after the down payment", result.Notes);
        Assert.Single(result.State.Accounts);
    }

    [Fact]
    public async Task AddSnapshotAsync_WithoutState_FallsBackToStoredWorkspace()
    {
        var projection = MakeProjection(MakeState(cash: 12_345m));
        _repoMock.Setup(r => r.GetByIdAsync(projection.Id, _userId)).ReturnsAsync(projection);
        _snapshotRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<ProjectionSnapshot>()))
            .ReturnsAsync((ProjectionSnapshot s) => s);

        var result = await _service.AddSnapshotAsync(projection.Id, _userId, new CreateProjectionSnapshotRequest
        {
            SnapshotDate = new DateTime(2027, 1, 1),
            Kind = ProjectionSnapshotKind.Projected
        });

        Assert.Equal(12_345m, result.LiquidNetWorth);
        Assert.Null(result.Notes);
    }

    [Fact]
    public async Task AddSnapshotAsync_WhenDateAndKindAlreadySaved_UpdatesThatPointInsteadOfInserting()
    {
        var projection = MakeProjection();
        var date = new DateTime(2027, 6, 30, 0, 0, 0, DateTimeKind.Utc);
        var existing = ProjectionSnapshot.Create(
            _userId, projection.Id, date, ProjectionSnapshotKind.Projected,
            "first pass", 100m, 100m, 100m, 0m, "{}");

        _repoMock.Setup(r => r.GetByIdAsync(projection.Id, _userId)).ReturnsAsync(projection);
        _snapshotRepoMock
            .Setup(r => r.GetByDateAndKindAsync(_userId, projection.Id, date, ProjectionSnapshotKind.Projected))
            .ReturnsAsync(existing);
        _snapshotRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<ProjectionSnapshot>()))
            .ReturnsAsync((ProjectionSnapshot s) => s);

        var result = await _service.AddSnapshotAsync(projection.Id, _userId, new CreateProjectionSnapshotRequest
        {
            SnapshotDate = date,
            Kind = ProjectionSnapshotKind.Projected,
            Notes = "second pass",
            State = MakeState(cash: 8_000m)
        });

        Assert.Equal(existing.Id, result.Id);
        Assert.Equal(8_000m, result.LiquidNetWorth);
        Assert.Equal("second pass", result.Notes);
        _snapshotRepoMock.Verify(r => r.CreateAsync(It.IsAny<ProjectionSnapshot>()), Times.Never);
    }

    [Fact]
    public async Task AddSnapshotAsync_WithSameDateButOtherKind_CreatesASecondPoint()
    {
        var projection = MakeProjection();
        var date = new DateTime(2027, 6, 30, 0, 0, 0, DateTimeKind.Utc);

        _repoMock.Setup(r => r.GetByIdAsync(projection.Id, _userId)).ReturnsAsync(projection);
        _snapshotRepoMock
            .Setup(r => r.GetByDateAndKindAsync(_userId, projection.Id, date, ProjectionSnapshotKind.Realized))
            .ReturnsAsync((ProjectionSnapshot?)null);
        _snapshotRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<ProjectionSnapshot>()))
            .ReturnsAsync((ProjectionSnapshot s) => s);

        var result = await _service.AddSnapshotAsync(projection.Id, _userId, new CreateProjectionSnapshotRequest
        {
            SnapshotDate = date,
            Kind = ProjectionSnapshotKind.Realized,
            State = MakeState(cash: 7_000m)
        });

        Assert.Equal(ProjectionSnapshotKind.Realized, result.Kind);
        _snapshotRepoMock.Verify(r => r.CreateAsync(It.IsAny<ProjectionSnapshot>()), Times.Once);
        _snapshotRepoMock.Verify(r => r.UpdateAsync(It.IsAny<ProjectionSnapshot>()), Times.Never);
    }

    [Fact]
    public async Task AddSnapshotAsync_NormalizesDateToUtcMidnight()
    {
        var projection = MakeProjection();
        _repoMock.Setup(r => r.GetByIdAsync(projection.Id, _userId)).ReturnsAsync(projection);
        _snapshotRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<ProjectionSnapshot>()))
            .ReturnsAsync((ProjectionSnapshot s) => s);

        var result = await _service.AddSnapshotAsync(projection.Id, _userId, new CreateProjectionSnapshotRequest
        {
            SnapshotDate = new DateTime(2027, 3, 15, 17, 42, 9),
            Kind = ProjectionSnapshotKind.Projected
        });

        // Npgsql rejects non-UTC values on a timestamptz column.
        Assert.Equal(DateTimeKind.Utc, result.SnapshotDate.Kind);
        Assert.Equal(new DateTime(2027, 3, 15), result.SnapshotDate.Date);
        Assert.Equal(TimeSpan.Zero, result.SnapshotDate.TimeOfDay);
    }

    [Fact]
    public async Task AddSnapshotAsync_WithMissingDate_ThrowsValidationException()
    {
        var projection = MakeProjection();
        _repoMock.Setup(r => r.GetByIdAsync(projection.Id, _userId)).ReturnsAsync(projection);

        await Assert.ThrowsAsync<ValidationException>(
            () => _service.AddSnapshotAsync(projection.Id, _userId, new CreateProjectionSnapshotRequest
            {
                Kind = ProjectionSnapshotKind.Projected
            }));

        _snapshotRepoMock.Verify(r => r.CreateAsync(It.IsAny<ProjectionSnapshot>()), Times.Never);
    }

    [Fact]
    public async Task AddSnapshotAsync_WithUnknownProjection_ThrowsNotFoundException()
    {
        var id = Guid.NewGuid();
        _repoMock.Setup(r => r.GetByIdAsync(id, _userId)).ReturnsAsync((Projection?)null);

        await Assert.ThrowsAsync<NotFoundException>(
            () => _service.AddSnapshotAsync(id, _userId, new CreateProjectionSnapshotRequest
            {
                SnapshotDate = new DateTime(2027, 1, 1),
                Kind = ProjectionSnapshotKind.Projected
            }));
    }

    // ── Loan sign normalization ──────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_WithNegativeSeedLoanBalance_StoresItAsPositiveDebt()
    {
        // GET /loans negates the balance for display; a ledger seeded from it arrives negative.
        var state = MakeState(cash: 10_000m, loanBalance: -3_000m);
        Projection? captured = null;

        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<Projection>()))
            .Callback<Projection>(p => captured = p)
            .ReturnsAsync((Projection p) => p);

        var result = await _service.CreateAsync(_userId, new CreateProjectionRequest
        {
            Name = "Seeded",
            State = state
        });

        Assert.Equal(3_000m, result.Workspace.Loans.Single().Balance);
        Assert.DoesNotContain("-3000", captured!.WorkspaceStateJson);
    }

    [Fact]
    public async Task AddSnapshotAsync_WithNegativeLoanBalance_AddsItToLiabilities()
    {
        var projection = MakeProjection();
        _repoMock.Setup(r => r.GetByIdAsync(projection.Id, _userId)).ReturnsAsync(projection);
        _snapshotRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<ProjectionSnapshot>()))
            .ReturnsAsync((ProjectionSnapshot s) => s);

        var result = await _service.AddSnapshotAsync(projection.Id, _userId, new CreateProjectionSnapshotRequest
        {
            SnapshotDate = new DateTime(2027, 1, 1),
            Kind = ProjectionSnapshotKind.Projected,
            State = MakeState(cash: 10_000m, cardBalance: 2_000m, loanBalance: -3_000m)
        });

        // The loan is debt: 2,000 card + 3,000 loan. Before the fix this came to -1,000.
        Assert.Equal(5_000m, result.TotalLiabilities);
        Assert.Equal(10_000m, result.TotalAssets);
        Assert.Equal(5_000m, result.LiquidNetWorth);
        Assert.Equal(3_000m, result.State.Loans.Single().Balance);
    }

    [Fact]
    public async Task GetByIdAsync_WithLegacyNegativeLoanInStoredJson_ReturnsItPositive()
    {
        var projection = MakeProjection(MakeState(cash: 1_000m, loanBalance: -750m));
        _repoMock.Setup(r => r.GetByIdAsync(projection.Id, _userId)).ReturnsAsync(projection);
        _snapshotRepoMock.Setup(r => r.GetByProjectionAsync(_userId, projection.Id)).ReturnsAsync([]);

        var result = await _service.GetByIdAsync(projection.Id, _userId);

        Assert.Equal(750m, result.Workspace.Loans.Single().Balance);
    }

    [Fact]
    public async Task SaveWorkspaceAsync_WithNegativeLoanBalance_PersistsItPositive()
    {
        var projection = MakeProjection();
        _repoMock.Setup(r => r.GetByIdAsync(projection.Id, _userId)).ReturnsAsync(projection);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<Projection>())).ReturnsAsync((Projection p) => p);

        await _service.SaveWorkspaceAsync(projection.Id, _userId, new SaveProjectionWorkspaceRequest
        {
            State = MakeState(loanBalance: -4_200m)
        });

        Assert.Contains("4200", projection.WorkspaceStateJson);
        Assert.DoesNotContain("-4200", projection.WorkspaceStateJson);
    }

    // ── SaveWorkspaceAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task SaveWorkspaceAsync_OverwritesLedgerWithoutTouchingSnapshots()
    {
        var projection = MakeProjection(MakeState(cash: 1_000m));
        _repoMock.Setup(r => r.GetByIdAsync(projection.Id, _userId)).ReturnsAsync(projection);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<Projection>())).ReturnsAsync((Projection p) => p);

        await _service.SaveWorkspaceAsync(projection.Id, _userId, new SaveProjectionWorkspaceRequest
        {
            State = MakeState(cash: 9_900m)
        });

        Assert.Contains("9900", projection.WorkspaceStateJson);
        Assert.DoesNotContain("1000", projection.WorkspaceStateJson);
        _snapshotRepoMock.VerifyNoOtherCalls();
    }

    // ── DeleteAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_SoftDeletesSnapshotsBeforeProjection()
    {
        var projection = MakeProjection();
        _repoMock.Setup(r => r.GetByIdAsync(projection.Id, _userId)).ReturnsAsync(projection);

        await _service.DeleteAsync(projection.Id, _userId);

        _snapshotRepoMock.Verify(r => r.SoftDeleteByProjectionAsync(_userId, projection.Id), Times.Once);
        _repoMock.Verify(r => r.SoftDeleteAsync(projection.Id, _userId), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_WithUnknownProjection_ThrowsAndDeletesNothing()
    {
        var id = Guid.NewGuid();
        _repoMock.Setup(r => r.GetByIdAsync(id, _userId)).ReturnsAsync((Projection?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.DeleteAsync(id, _userId));

        _snapshotRepoMock.Verify(r => r.SoftDeleteByProjectionAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
        _repoMock.Verify(r => r.SoftDeleteAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    // ── DeleteSnapshotAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task DeleteSnapshotAsync_WhenSnapshotBelongsToAnotherProjection_ThrowsNotFoundException()
    {
        var projection = MakeProjection();
        var stray = ProjectionSnapshot.Create(
            _userId, Guid.NewGuid(), DateTime.UtcNow, ProjectionSnapshotKind.Projected,
            null, 0m, 0m, 0m, 0m, "{}");

        _repoMock.Setup(r => r.GetByIdAsync(projection.Id, _userId)).ReturnsAsync(projection);
        _snapshotRepoMock.Setup(r => r.GetByIdAsync(stray.Id, _userId)).ReturnsAsync(stray);

        await Assert.ThrowsAsync<NotFoundException>(
            () => _service.DeleteSnapshotAsync(projection.Id, stray.Id, _userId));

        _snapshotRepoMock.Verify(r => r.SoftDeleteAsync(It.IsAny<Guid>(), It.IsAny<Guid>()), Times.Never);
    }

    // ── GetAllAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_SummarizesEachProjectionFromItsOwnSnapshots()
    {
        var mine = MakeProjection();
        var other = Projection.Create(_userId, "Other", null, "{}");

        var older = ProjectionSnapshot.Create(
            _userId, mine.Id, new DateTime(2027, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            ProjectionSnapshotKind.Projected, null, 10m, 10m, 10m, 0m, "{}");
        var newer = ProjectionSnapshot.Create(
            _userId, mine.Id, new DateTime(2027, 6, 1, 0, 0, 0, DateTimeKind.Utc),
            ProjectionSnapshotKind.Realized, null, 40m, 90m, 90m, 0m, "{}");
        var elsewhere = ProjectionSnapshot.Create(
            _userId, other.Id, new DateTime(2027, 9, 1, 0, 0, 0, DateTimeKind.Utc),
            ProjectionSnapshotKind.Projected, null, 5m, 5m, 5m, 0m, "{}");

        _repoMock.Setup(r => r.GetAllOrderedAsync(_userId)).ReturnsAsync([mine, other]);
        _snapshotRepoMock.Setup(r => r.GetAllForUserAsync(_userId)).ReturnsAsync([older, newer, elsewhere]);

        var results = (await _service.GetAllAsync(_userId)).ToList();

        var summary = results.Single(r => r.Id == mine.Id);
        Assert.Equal(2, summary.SnapshotCount);
        Assert.Equal(1, summary.ProjectedCount);
        Assert.Equal(1, summary.RealizedCount);
        Assert.Equal(newer.SnapshotDate, summary.LatestSnapshotDate);
        Assert.Equal(90m, summary.LatestTotalNetWorth);

        var otherSummary = results.Single(r => r.Id == other.Id);
        Assert.Equal(1, otherSummary.SnapshotCount);
    }

    // ── GetByIdAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_RoundTripsLedgerJsonBackIntoDto()
    {
        var projection = MakeProjection(MakeState(cash: 4_200m, propertyValue: 300_000m, propertyLoan: 100_000m));
        _repoMock.Setup(r => r.GetByIdAsync(projection.Id, _userId)).ReturnsAsync(projection);
        _snapshotRepoMock.Setup(r => r.GetByProjectionAsync(_userId, projection.Id)).ReturnsAsync([]);

        var result = await _service.GetByIdAsync(projection.Id, _userId);

        Assert.Equal(4_200m, result.Workspace.Accounts.Single().Balance);
        Assert.Equal("1 Main St", result.Workspace.Properties.Single().Address);
        Assert.Empty(result.Snapshots);
    }

    [Fact]
    public async Task GetByIdAsync_WithUnknownProjection_ThrowsNotFoundException()
    {
        var id = Guid.NewGuid();
        _repoMock.Setup(r => r.GetByIdAsync(id, _userId)).ReturnsAsync((Projection?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetByIdAsync(id, _userId));
    }
}
