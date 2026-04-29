using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;
using BabylonWealth.Services;
using Moq;

namespace BabylonWealth.Tests.Services;

public class SnapshotServiceTests
{
    private readonly Mock<INetWorthService>    _netWorthServiceMock = new();
    private readonly Mock<INetWorthRepository> _netWorthRepoMock    = new();
    private readonly SnapshotService           _service;
    private readonly Guid                      _userId = Guid.NewGuid();

    public SnapshotServiceTests()
    {
        _service = new SnapshotService(
            _netWorthServiceMock.Object,
            _netWorthRepoMock.Object);
    }

    // ── TakeSnapshotAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task TakeSnapshotAsync_WhenSnapshotAlreadyExistsForToday_ReturnsExistingWithoutCreating()
    {
        var existing = NetWorthSnapshot.Create(_userId, 50_000m, 80_000m, 100_000m, 50_000m, 5_000m, 10_000m, 1_000m);

        _netWorthRepoMock
            .Setup(r => r.GetLastSnapshotDateAsync(_userId))
            .ReturnsAsync(DateTime.UtcNow.Date);

        _netWorthRepoMock
            .Setup(r => r.GetLatestSnapshotAsync(_userId))
            .ReturnsAsync(existing);

        var result = await _service.TakeSnapshotAsync(_userId);

        Assert.Equal(existing.Id, result.Id);
        _netWorthRepoMock.Verify(r => r.CreateAsync(It.IsAny<NetWorthSnapshot>()), Times.Never);
    }

    [Fact]
    public async Task TakeSnapshotAsync_WhenNoPriorSnapshot_CallsCreateAsyncOnce()
    {
        _netWorthRepoMock
            .Setup(r => r.GetLastSnapshotDateAsync(_userId))
            .ReturnsAsync((DateTime?)null);

        _netWorthServiceMock
            .Setup(s => s.ComputeAsync(_userId))
            .ReturnsAsync(new NetWorthResponseDto
            {
                LiquidNetWorth   = 40_000m,
                TotalNetWorth    = 70_000m,
                TotalAssets      = 90_000m,
                TotalLiabilities = 50_000m,
                TotalCreditUsed  = 5_000m,
                TotalCreditLimit = 20_000m,
                PendingItemsNet  = 1_000m,
            });

        _netWorthRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<NetWorthSnapshot>()))
            .ReturnsAsync((NetWorthSnapshot s) => s);

        await _service.TakeSnapshotAsync(_userId);

        _netWorthRepoMock.Verify(r => r.CreateAsync(It.IsAny<NetWorthSnapshot>()), Times.Once);
    }

    [Fact]
    public async Task TakeSnapshotAsync_NewSnapshot_StoresNetWorthValuesFromComputeAsync()
    {
        _netWorthRepoMock
            .Setup(r => r.GetLastSnapshotDateAsync(_userId))
            .ReturnsAsync((DateTime?)null);

        _netWorthServiceMock
            .Setup(s => s.ComputeAsync(_userId))
            .ReturnsAsync(new NetWorthResponseDto
            {
                LiquidNetWorth   = 55_000m,
                TotalNetWorth    = 90_000m,
                TotalAssets      = 120_000m,
                TotalLiabilities = 65_000m,
                TotalCreditUsed  = 8_000m,
                TotalCreditLimit = 25_000m,
                PendingItemsNet  = 2_500m,
            });

        NetWorthSnapshot? captured = null;
        _netWorthRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<NetWorthSnapshot>()))
            .Callback<NetWorthSnapshot>(s => captured = s)
            .ReturnsAsync((NetWorthSnapshot s) => s);

        await _service.TakeSnapshotAsync(_userId);

        Assert.NotNull(captured);
        Assert.Equal(_userId,  captured.UserId);
        Assert.Equal(55_000m,  captured.LiquidNetWorth);
        Assert.Equal(90_000m,  captured.TotalNetWorth);
        Assert.Equal(120_000m, captured.TotalAssets);
        Assert.Equal(65_000m,  captured.TotalLiabilities);
        Assert.Equal(2_500m,   captured.TotalPending);
    }

    // ── ShouldTakeSnapshotAsync ───────────────────────────────────────────────

    [Fact]
    public async Task ShouldTakeSnapshotAsync_WhenNeverSnapped_ReturnsTrue()
    {
        _netWorthRepoMock
            .Setup(r => r.GetLastSnapshotDateAsync(_userId))
            .ReturnsAsync((DateTime?)null);

        var result = await _service.ShouldTakeSnapshotAsync(_userId);

        Assert.True(result);
    }

    [Fact]
    public async Task ShouldTakeSnapshotAsync_WhenLastSnapshotIsToday_ReturnsFalse()
    {
        _netWorthRepoMock
            .Setup(r => r.GetLastSnapshotDateAsync(_userId))
            .ReturnsAsync(DateTime.UtcNow.Date);

        var result = await _service.ShouldTakeSnapshotAsync(_userId);

        Assert.False(result);
    }

    [Fact]
    public async Task ShouldTakeSnapshotAsync_WhenLastSnapshotIsYesterday_ReturnsTrue()
    {
        _netWorthRepoMock
            .Setup(r => r.GetLastSnapshotDateAsync(_userId))
            .ReturnsAsync(DateTime.UtcNow.Date.AddDays(-1));

        var result = await _service.ShouldTakeSnapshotAsync(_userId);

        Assert.True(result);
    }

    // ── GetHistoryAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetHistoryAsync_MapsSnapshotFieldsToHistoryPointDto()
    {
        var snapshot = NetWorthSnapshot.Create(_userId, 60_000m, 95_000m, 115_000m, 55_000m, 6_000m, 12_000m, 500m);
        snapshot.AddAnnotation("Year-end review");

        _netWorthRepoMock
            .Setup(r => r.GetHistoryAsync(_userId, It.IsAny<DateTime>(), It.IsAny<DateTime>()))
            .ReturnsAsync([snapshot]);

        var result = (await _service.GetHistoryAsync(_userId, DateTime.UtcNow.AddDays(-30), DateTime.UtcNow)).ToList();

        Assert.Single(result);
        Assert.Equal(60_000m, result[0].LiquidNetWorth);
        Assert.Equal(95_000m, result[0].TotalNetWorth);
        Assert.Equal("Year-end review", result[0].Annotation);
    }

    [Fact]
    public async Task GetHistoryAsync_WithNoAnnotation_AnnotationIsNull()
    {
        var snapshot = NetWorthSnapshot.Create(_userId, 30_000m, 30_000m, 50_000m, 20_000m, 0m, 0m, 0m);

        _netWorthRepoMock
            .Setup(r => r.GetHistoryAsync(_userId, It.IsAny<DateTime>(), It.IsAny<DateTime>()))
            .ReturnsAsync([snapshot]);

        var result = (await _service.GetHistoryAsync(_userId, DateTime.MinValue, DateTime.UtcNow)).ToList();

        Assert.Single(result);
        Assert.Null(result[0].Annotation);
    }

    // ── AnnotateSnapshotAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task AnnotateSnapshotAsync_WhenSnapshotExists_CallsAnnotateWithCorrectId()
    {
        var snapshot = NetWorthSnapshot.Create(_userId, 50_000m, 80_000m, 100_000m, 50_000m, 5_000m, 10_000m, 0m);

        _netWorthRepoMock
            .Setup(r => r.GetHistoryAsync(_userId, DateTime.MinValue, It.IsAny<DateTime>()))
            .ReturnsAsync([snapshot]);

        await _service.AnnotateSnapshotAsync(_userId, DateTime.UtcNow, "Paid off car loan");

        _netWorthRepoMock.Verify(r => r.AnnotateAsync(snapshot.Id, _userId, "Paid off car loan"), Times.Once);
    }

    [Fact]
    public async Task AnnotateSnapshotAsync_WhenNoSnapshotsExist_DoesNotCallAnnotate()
    {
        _netWorthRepoMock
            .Setup(r => r.GetHistoryAsync(_userId, DateTime.MinValue, It.IsAny<DateTime>()))
            .ReturnsAsync([]);

        await _service.AnnotateSnapshotAsync(_userId, DateTime.UtcNow, "Some note");

        _netWorthRepoMock.Verify(
            r => r.AnnotateAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>()),
            Times.Never);
    }
}
