using BabylonWealth.Core.DTOs.Requests;
using BabylonWealth.Core.DTOs.Responses;
using BabylonWealth.Core.Entities;
using BabylonWealth.Core.Enums;
using BabylonWealth.Core.Exceptions;
using BabylonWealth.Core.Interfaces.Repositories;
using BabylonWealth.Core.Interfaces.Services;

namespace BabylonWealth.Services;

public class InvestmentService : IInvestmentService
{
    private readonly IInvestmentRepository _investmentRepo;

    public InvestmentService(IInvestmentRepository investmentRepo)
    {
        _investmentRepo = investmentRepo;
    }

    public async Task<IEnumerable<InvestmentResponseDto>> GetAllAsync(Guid userId)
    {
        var investments = await _investmentRepo.GetAllByUserAsync(userId);
        return investments.Select(ToDto);
    }

    public async Task<IEnumerable<InvestmentResponseDto>> GetByTypeAsync(Guid userId, InvestmentType type)
    {
        var investments = await _investmentRepo.GetByInvestmentTypeAsync(userId, type);
        return investments.Select(ToDto);
    }

    public async Task<InvestmentResponseDto> GetByIdAsync(Guid id, Guid userId)
    {
        var investment = await _investmentRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(Investment), id);
        return ToDto(investment);
    }

    public async Task<InvestmentResponseDto> CreateAsync(Guid userId, CreateInvestmentRequest request)
    {
        var investment = Investment.Create(
            userId,
            request.BankId,
            request.CustomLabel,
            request.CurrentValue,
            request.InvestmentType,
            request.Ticker);

        var created = await _investmentRepo.CreateAsync(investment);

        // Re-fetch to populate Bank navigation property
        var withBank = await _investmentRepo.GetByIdAsync(created.Id, userId);
        return ToDto(withBank!);
    }

    public async Task<InvestmentResponseDto> UpdateAsync(Guid id, Guid userId, UpdateInvestmentRequest request)
    {
        var investment = await _investmentRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(Investment), id);

        investment.Update(
            request.BankId,
            request.CustomLabel,
            request.CurrentValue,
            request.InvestmentType,
            request.Ticker);

        await _investmentRepo.UpdateAsync(investment);

        // Re-fetch to populate Bank navigation property
        var withBank = await _investmentRepo.GetByIdAsync(id, userId);
        return ToDto(withBank!);
    }

    public async Task SoftDeleteAsync(Guid id, Guid userId)
    {
        _ = await _investmentRepo.GetByIdAsync(id, userId)
            ?? throw new NotFoundException(nameof(Investment), id);

        await _investmentRepo.SoftDeleteAsync(id, userId);
    }

    public async Task<InvestmentSummaryDto> GetSummaryAsync(Guid userId)
    {
        var investments = await _investmentRepo.GetAllByUserAsync(userId);
        var list = investments.ToList();
        var total = await _investmentRepo.GetTotalValueAsync(userId);

        return new InvestmentSummaryDto
        {
            TotalValue = total,
            InvestmentCount = list.Count
        };
    }

    private static InvestmentResponseDto ToDto(Investment i) => new()
    {
        Id = i.Id,
        BankId = i.BankId,
        BankName = i.Bank?.Name,
        BankLogoUrl = i.Bank?.LogoUrl,
        CustomLabel = i.CustomLabel,
        CurrentValue = i.CurrentValue,
        Ticker = i.Ticker,
        InvestmentType = i.InvestmentType,
        CreatedAt = i.CreatedAt,
        UpdatedAt = i.UpdatedAt
    };
}
