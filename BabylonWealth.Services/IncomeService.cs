using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class IncomeService : IIncomeService
{
    private readonly IIncomeRepository _incomeRepo;

    public IncomeService(IIncomeRepository incomeRepo)
    {
        _incomeRepo = incomeRepo;
    }

    public async Task<IEnumerable<IncomeResponseDto>> GetAllAsync(Guid userId)
    {
        var sources = await _incomeRepo.GetAllByUserAsync(userId);
        return sources.Select(ToDto);
    }

    public async Task<IncomeResponseDto> CreateAsync(Guid userId, CreateIncomeRequest request)
    {
        var source = IncomeSource.Create(userId, request.Name, request.Type, request.AnnualAmount);
        await _incomeRepo.CreateAsync(source);
        return ToDto(source);
    }

    public async Task<IncomeResponseDto> UpdateAsync(Guid id, Guid userId, UpdateIncomeRequest request)
    {
        var source = await _incomeRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(IncomeSource), id);

        source.Update(
            request.Name ?? source.Name,
            request.Type ?? source.Type,
            request.AnnualAmount ?? source.AnnualAmount);

        await _incomeRepo.UpdateAsync(source);
        return ToDto(source);
    }

    public async Task SoftDeleteAsync(Guid id, Guid userId)
    {
        _ = await _incomeRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(IncomeSource), id);

        await _incomeRepo.SoftDeleteAsync(id, userId);
    }

    public Task<decimal> GetAnnualTotalAsync(Guid userId) =>
        _incomeRepo.GetAnnualTotalAsync(userId);

    private static IncomeResponseDto ToDto(IncomeSource s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Type = s.Type,
        AnnualAmount = s.AnnualAmount,
        MonthlyAmount = s.AnnualAmount / 12m,
        ArkadSavingsTarget = s.AnnualAmount * 0.10m,
        IsActive = s.IsActive,
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt
    };
}
