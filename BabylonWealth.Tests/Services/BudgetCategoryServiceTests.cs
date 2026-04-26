using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Services;
using BabylonWealth.Tests.Helpers;
using Moq;

namespace BabylonWealth.Tests.Services;

public class BudgetCategoryServiceTests
{
    private readonly Mock<IBudgetCategoryRepository> _repoMock = new();
    private readonly BudgetCategoryService _service;
    private readonly Guid _userId = Guid.NewGuid();

    public BudgetCategoryServiceTests()
    {
        _service = new BudgetCategoryService(_repoMock.Object);
    }

    // ── CreateAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_WithRoomInBudget_CreatesAndReturnsCategory()
    {
        _repoMock.Setup(r => r.GetTotalPercentageAsync(_userId, null)).ReturnsAsync(0.90m);
        _repoMock.Setup(r => r.GetByDisplayOrderAsync(_userId)).ReturnsAsync([]);
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<BudgetCategory>()))
                 .ReturnsAsync((BudgetCategory c) => c);

        var result = await _service.CreateAsync(_userId, new CreateBudgetCategoryRequest
        {
            Name = "Emergency Fund",
            TargetPercentage = 0.10m,
            Color = "#FFFFFF"
        });

        Assert.Equal("Emergency Fund", result.Name);
        Assert.Equal(0.10m, result.TargetPercentage);
        _repoMock.Verify(r => r.CreateAsync(It.IsAny<BudgetCategory>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_WouldExceed100Percent_ThrowsValidationException()
    {
        _repoMock.Setup(r => r.GetTotalPercentageAsync(_userId, null)).ReturnsAsync(0.95m);

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.CreateAsync(_userId, new CreateBudgetCategoryRequest
            {
                Name = "Too Much",
                TargetPercentage = 0.10m,
                Color = "#FFFFFF"
            }));

        _repoMock.Verify(r => r.CreateAsync(It.IsAny<BudgetCategory>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_AlreadyAt100Percent_ThrowsValidationException()
    {
        _repoMock.Setup(r => r.GetTotalPercentageAsync(_userId, null)).ReturnsAsync(1.00m);

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.CreateAsync(_userId, new CreateBudgetCategoryRequest
            {
                Name = "One More",
                TargetPercentage = 0.01m,
                Color = "#FFFFFF"
            }));
    }

    // ── UpdateAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_NewPercentageFits_UpdatesCategory()
    {
        var categoryId = Guid.NewGuid();
        var existing = EntityFactory.MakeBudgetCategory(_userId, targetPercentage: 0.50m);

        _repoMock.Setup(r => r.GetByIdAsync(categoryId, _userId)).ReturnsAsync(existing);
        _repoMock.Setup(r => r.GetTotalPercentageAsync(_userId, categoryId)).ReturnsAsync(0.50m);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<BudgetCategory>()))
                 .ReturnsAsync((BudgetCategory c) => c);

        var result = await _service.UpdateAsync(categoryId, _userId, new UpdateBudgetCategoryRequest
        {
            TargetPercentage = 0.45m
        });

        Assert.Equal(0.45m, result.TargetPercentage);
        _repoMock.Verify(r => r.UpdateAsync(It.IsAny<BudgetCategory>()), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_NewPercentageWouldExceed100_ThrowsValidationException()
    {
        var categoryId = Guid.NewGuid();
        var existing = EntityFactory.MakeBudgetCategory(_userId, targetPercentage: 0.50m);

        _repoMock.Setup(r => r.GetByIdAsync(categoryId, _userId)).ReturnsAsync(existing);
        // Other categories already use 50%; setting this to 60% pushes total to 110%
        _repoMock.Setup(r => r.GetTotalPercentageAsync(_userId, categoryId)).ReturnsAsync(0.50m);

        await Assert.ThrowsAsync<ValidationException>(() =>
            _service.UpdateAsync(categoryId, _userId, new UpdateBudgetCategoryRequest
            {
                TargetPercentage = 0.60m
            }));

        _repoMock.Verify(r => r.UpdateAsync(It.IsAny<BudgetCategory>()), Times.Never);
    }

    [Fact]
    public async Task UpdateAsync_CategoryNotFound_ThrowsNotFoundException()
    {
        var categoryId = Guid.NewGuid();
        _repoMock.Setup(r => r.GetByIdAsync(categoryId, _userId)).ReturnsAsync((BudgetCategory?)null);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _service.UpdateAsync(categoryId, _userId, new UpdateBudgetCategoryRequest { Name = "New Name" }));
    }

    // ── SeedDefaultCategoriesAsync ───────────────────────────────────────────

    [Fact]
    public async Task SeedDefaultCategoriesAsync_NoExistingCategories_SeedsAll5()
    {
        _repoMock.Setup(r => r.HasCategoriesAsync(_userId)).ReturnsAsync(false);
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<BudgetCategory>()))
                 .ReturnsAsync((BudgetCategory c) => c);

        await _service.SeedDefaultCategoriesAsync(_userId);

        _repoMock.Verify(r => r.CreateAsync(It.IsAny<BudgetCategory>()), Times.Exactly(5));
    }

    [Fact]
    public async Task SeedDefaultCategoriesAsync_CategoriesAlreadyExist_SkipsSeeding()
    {
        _repoMock.Setup(r => r.HasCategoriesAsync(_userId)).ReturnsAsync(true);

        await _service.SeedDefaultCategoriesAsync(_userId);

        _repoMock.Verify(r => r.CreateAsync(It.IsAny<BudgetCategory>()), Times.Never);
    }
}
