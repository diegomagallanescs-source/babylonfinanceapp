using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Services;
using Moq;

namespace BabylonWealth.Tests.Services;

public class PropertyServiceTests
{
    private readonly Mock<IPropertyRepository> _repoMock = new();
    private readonly PropertyService _service;
    private readonly Guid _userId = Guid.NewGuid();

    public PropertyServiceTests()
    {
        _service = new PropertyService(_repoMock.Object);
    }

    private static Property MakeProperty(Guid userId, decimal purchasePrice = 300_000m,
        decimal currentValue = 320_000m, decimal loanBalance = 240_000m,
        decimal monthlyRent = 2_000m, decimal monthlyExpenses = 1_200m)
    {
        return Property.Create(
            userId,
            "123 Main St",
            purchasePrice,
            currentValue,
            loanBalance,
            0.07m,
            LoanProductType.Conventional,
            monthlyRent,
            monthlyExpenses);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsAllProperties_MappedToDto()
    {
        var properties = new[] { MakeProperty(_userId), MakeProperty(_userId) };
        _repoMock.Setup(r => r.GetAllByUserAsync(_userId)).ReturnsAsync(properties);

        var result = (await _service.GetAllAsync(_userId)).ToList();

        Assert.Equal(2, result.Count);
        Assert.All(result, r => Assert.Equal("123 Main St", r.Address));
    }

    [Fact]
    public async Task GetAllAsync_MonthlyCashFlow_IsRentMinusExpenses()
    {
        var property = MakeProperty(_userId, monthlyRent: 2_500m, monthlyExpenses: 1_800m);
        _repoMock.Setup(r => r.GetAllByUserAsync(_userId)).ReturnsAsync([property]);

        var result = (await _service.GetAllAsync(_userId)).Single();

        Assert.Equal(700m, result.MonthlyCashFlow);
    }

    [Fact]
    public async Task GetAllAsync_Equity_IsEstimatedValueMinusLoanBalance()
    {
        var property = MakeProperty(_userId, currentValue: 350_000m, loanBalance: 200_000m);
        _repoMock.Setup(r => r.GetAllByUserAsync(_userId)).ReturnsAsync([property]);

        var result = (await _service.GetAllAsync(_userId)).Single();

        Assert.Equal(150_000m, result.Equity);
    }

    [Fact]
    public async Task GetByIdAsync_PropertyNotFound_ThrowsNotFoundException()
    {
        _repoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), _userId)).ReturnsAsync((Property?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetByIdAsync(Guid.NewGuid(), _userId));
    }

    [Fact]
    public async Task CreateAsync_CallsRepoCreate_ReturnsDto()
    {
        var request = new CreatePropertyRequest
        {
            Address = "456 Oak Ave",
            PurchasePrice = 400_000m,
            CurrentEstimatedValue = 420_000m,
            LoanBalance = 320_000m,
            InterestRate = 0.065m,
            LoanType = LoanProductType.Conventional,
            MonthlyRent = 2_800m,
            MonthlyExpenses = 1_500m,
        };

        _repoMock.Setup(r => r.CreateAsync(It.IsAny<Property>()))
            .ReturnsAsync((Property p) => p);

        var result = await _service.CreateAsync(_userId, request);

        Assert.Equal("456 Oak Ave", result.Address);
        Assert.Equal(400_000m, result.PurchasePrice);
        Assert.Equal(100_000m, result.Equity);
        Assert.Equal(1_300m, result.MonthlyCashFlow);
        _repoMock.Verify(r => r.CreateAsync(It.IsAny<Property>()), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_PropertyNotFound_ThrowsNotFoundException()
    {
        _repoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), _userId)).ReturnsAsync((Property?)null);

        var request = new UpdatePropertyRequest { Address = "New Address" };
        await Assert.ThrowsAsync<NotFoundException>(() => _service.UpdateAsync(Guid.NewGuid(), _userId, request));
    }

    [Fact]
    public async Task UpdateAsync_UpdatesAllFields()
    {
        var property = MakeProperty(_userId);
        _repoMock.Setup(r => r.GetByIdAsync(property.Id, _userId)).ReturnsAsync(property);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<Property>()))
            .ReturnsAsync((Property p) => p);

        var request = new UpdatePropertyRequest
        {
            Address = "Updated Address",
            PurchasePrice = 350_000m,
            CurrentEstimatedValue = 400_000m,
            LoanBalance = 280_000m,
            InterestRate = 0.06m,
            LoanType = LoanProductType.Conventional,
            MonthlyRent = 2_200m,
            MonthlyExpenses = 1_300m,
        };

        var result = await _service.UpdateAsync(property.Id, _userId, request);

        Assert.Equal("Updated Address", result.Address);
        Assert.Equal(120_000m, result.Equity);
        Assert.Equal(900m, result.MonthlyCashFlow);
        _repoMock.Verify(r => r.UpdateAsync(It.IsAny<Property>()), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_PropertyNotFound_ThrowsNotFoundException()
    {
        _repoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), _userId)).ReturnsAsync((Property?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.DeleteAsync(Guid.NewGuid(), _userId));
    }

    [Fact]
    public async Task DeleteAsync_CallsSoftDelete()
    {
        var property = MakeProperty(_userId);
        _repoMock.Setup(r => r.GetByIdAsync(property.Id, _userId)).ReturnsAsync(property);
        _repoMock.Setup(r => r.SoftDeleteAsync(property.Id, _userId)).Returns(Task.CompletedTask);

        await _service.DeleteAsync(property.Id, _userId);

        _repoMock.Verify(r => r.SoftDeleteAsync(property.Id, _userId), Times.Once);
    }
}
