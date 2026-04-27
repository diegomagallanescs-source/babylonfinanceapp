using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class PropertyService : IPropertyService
{
    private readonly IPropertyRepository _repo;

    public PropertyService(IPropertyRepository repo)
    {
        _repo = repo;
    }

    public async Task<IEnumerable<PropertyResponseDto>> GetAllAsync(Guid userId)
    {
        var properties = await _repo.GetAllByUserAsync(userId);
        return properties.Select(ToDto);
    }

    public async Task<PropertyResponseDto> GetByIdAsync(Guid id, Guid userId)
    {
        var property = await _repo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(Property), id);
        return ToDto(property);
    }

    public async Task<PropertyResponseDto> CreateAsync(Guid userId, CreatePropertyRequest request)
    {
        var property = Property.Create(
            userId,
            request.Address,
            request.PurchasePrice,
            request.CurrentEstimatedValue,
            request.LoanBalance,
            request.InterestRate,
            request.LoanType,
            request.MonthlyRent,
            request.MonthlyExpenses);

        var created = await _repo.CreateAsync(property);
        return ToDto(created);
    }

    public async Task<PropertyResponseDto> UpdateAsync(Guid id, Guid userId, UpdatePropertyRequest request)
    {
        var property = await _repo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(Property), id);

        property.Update(
            request.Address,
            request.PurchasePrice,
            request.CurrentEstimatedValue,
            request.LoanBalance,
            request.InterestRate,
            request.LoanType,
            request.MonthlyRent,
            request.MonthlyExpenses);

        await _repo.UpdateAsync(property);
        return ToDto(property);
    }

    public async Task DeleteAsync(Guid id, Guid userId)
    {
        _ = await _repo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(Property), id);

        await _repo.SoftDeleteAsync(id, userId);
    }

    private static PropertyResponseDto ToDto(Property p) => new()
    {
        Id = p.Id,
        Address = p.Address,
        PurchasePrice = p.PurchasePrice,
        CurrentEstimatedValue = p.CurrentEstimatedValue,
        LoanBalance = p.LoanBalance,
        Equity = p.Equity,
        InterestRate = p.InterestRate,
        LoanType = p.LoanType,
        MonthlyRent = p.MonthlyRent,
        MonthlyExpenses = p.MonthlyExpenses,
        MonthlyCashFlow = p.MonthlyRent - p.MonthlyExpenses,
        LastValueUpdateDate = p.LastValueUpdateDate,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt,
    };
}
